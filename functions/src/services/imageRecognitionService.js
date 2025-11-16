/**
 * imageRecognitionService.js – Versão AVANÇADA
 * Pipeline:
 *  1. Food101 (detecção principal)
 *  2. ViT Base (validação cruzada)
 *  3. BLIP ou Florence (captioning da foto)
 *  4. Fusão multi-modelo
 *  5. Estimativa de porção automática
 *  6. Inferência de preparo (grelhado/cozido/frito)
 *  7. Ajuste nutricional automático
 *  8. Fallback mock caso qualquer etapa falhe
 */

const axios = require("axios");

// ====== 1. MODELOS (Hugging Face) ======
const foodModelEnv = process.env.HF_FOOD_MODEL || process.env.HF_FOOD_MODEL_URL;
const vitModelEnv = process.env.HF_VIT_MODEL || process.env.HF_VIT_MODEL_URL;
const captionModelEnv = process.env.HF_CAPTION_MODEL || process.env.HF_CAPTION_MODEL_URL;

const MODELS = {
  FOOD101: foodModelEnv || "nateraw/food101",
  VIT: vitModelEnv || "google/vit-base-patch16-224",
  CAPTION: captionModelEnv || "Salesforce/blip-image-captioning-base"
};

const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN;

// ========================================
//  FUNÇÃO CENTRAL DE INFERÊNCIA
// ========================================
async function recognizeImage(buffer) {
  const provider = process.env.VISION_PROVIDER || "mock";

  if (provider === "mock") {
    return recognizeMock();
  }

  try {
    // Etapa 1 — Food101
    const foodLabels = await inferFood101(buffer);

    // Etapa 2 — ViT valida rótulos
    const validated = await crossValidateWithViT(buffer, foodLabels);

    // Etapa 3 — Captioning
    const caption = await describeImage(buffer);

    // Etapa 4 — Fusão
    const fused = fuseResults(validated, caption);

    // Etapa 5 — Estimar porção
    const itemsWithPortion = fused.map((item) => ({
      ...item,
      estimated_serving: estimatePortion(item.label),
      serving_unit: "g"
    }));

    // Etapa 6 — Inferir preparo (heurística)
    const itemsPrep = await Promise.all(
      itemsWithPortion.map(async (i) => ({
        ...i,
        preparation: inferPreparation(i.label),
        nutrition: correctNutrition(i.label, inferPreparation(i.label), i.estimated_serving)
      }))
    );

    // Gerar totais
    const totals = sumTotals(itemsPrep);

    return {
      success: true,
      caption,
      items: itemsPrep,
      ...totals
    };

  } catch (err) {
    console.error("Erro IA completa:", err);
    return recognizeMock();
  }
}

// ========================================
// 1. Food101 (modelo principal)
// ========================================
async function inferFood101(buffer) {
  const res = await hfPost(MODELS.FOOD101, buffer);
  return res.map((r) => ({
    label: r.label.replace("_", " "),
    confidence: r.score
  }));
}

// ========================================
// 2. ViT — validação cruzada
// ========================================
async function crossValidateWithViT(buffer, foodLabels) {
  const vit = await hfPost(MODELS.VIT, buffer);

  return foodLabels.filter((f) => {
    return vit.some((v) => similarity(v.label, f.label) >= 0.3);
  });
}

// Similaridade básica entre labels
function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a.includes(b) || b.includes(a)) return 1;
  return 0;
}

// ========================================
// 3. BLIP — Captioning da foto
// ========================================
async function describeImage(buffer) {
  const res = await hfPost(MODELS.CAPTION, buffer);
  return res[0]?.generated_text || "";
}

// ========================================
// 4. Fusão multi-modelo
// ========================================
function fuseResults(foodList, caption) {
  const fused = [...foodList];

  // Se o caption menciona alimentos
  caption.split(" ").forEach((word) => {
    if (word.match(/rice|chicken|salad|egg|pasta/i)) {
      fused.push({ label: word, confidence: 0.5 });
    }
  });

  // Remover duplicados
  const map = new Map();
  fused.forEach((i) => map.set(i.label.toLowerCase(), i));
  return Array.from(map.values());
}

// ========================================
// 5. Estimativa de porção (heurísticas)
// ========================================
function estimatePortion(label) {
  label = label.toLowerCase();
  if (label.includes("rice") || label.includes("arroz")) return 120;
  if (label.includes("chicken") || label.includes("frango")) return 150;
  if (label.includes("salad") || label.includes("salada")) return 80;
  if (label.includes("egg") || label.includes("ovo")) return 55;
  if (label.includes("pasta") || label.includes("massa")) return 130;
  return 100;
}

// ========================================
// 6. Inferir preparo
// ========================================
function inferPreparation(label) {
  label = label.toLowerCase();

  if (label.includes("fried") || label.includes("frito")) return "frito";
  if (label.includes("grilled") || label.includes("grelhado")) return "grelhado";

  return "cozido";
}

// ========================================
// 7. Correção nutricional
// ========================================
function correctNutrition(label, prep, grams) {
  // Valores base por 100g (simplificados)
  const base = {
    frango: { cal: 165, p: 31, c: 0, g: 3.6 },
    arroz: { cal: 130, p: 2.7, c: 28, g: 0.3 },
    salada: { cal: 20, p: 1, c: 3, g: 0 },
    ovo: { cal: 155, p: 13, c: 1.1, g: 11 },
    massa: { cal: 131, p: 5, c: 25, g: 1.1 }
  };

  const key = Object.keys(base).find((k) => label.includes(k)) || "arroz";
  const ref = base[key];

  let fatorPrep = 1;
  if (prep === "grelhado") fatorPrep = 1.15;
  if (prep === "frito") fatorPrep = 1.35;

  const scale = (grams / 100) * fatorPrep;

  return {
    calories: ref.cal * scale,
    protein: ref.p * scale,
    carbs: ref.c * scale,
    fat: ref.g * scale
  };
}

// ========================================
// Totais do prato
// ========================================
function sumTotals(items) {
  return {
    total_calories: items.reduce((a, b) => a + b.nutrition.calories, 0),
    total_protein: items.reduce((a, b) => a + b.nutrition.protein, 0),
    total_carbs: items.reduce((a, b) => a + b.nutrition.carbs, 0),
    total_fat: items.reduce((a, b) => a + b.nutrition.fat, 0)
  };
}

// ========================================
// Fallback mock
// ========================================
function recognizeMock() {
  return {
    success: true,
    caption: "prato com arroz e frango",
    items: [
      {
        label: "Frango grelhado",
        preparation: "grelhado",
        estimated_serving: 150,
        nutrition: correctNutrition("frango", "grelhado", 150)
      },
      {
        label: "Arroz branco",
        preparation: "cozido",
        estimated_serving: 120,
        nutrition: correctNutrition("arroz", "cozido", 120)
      }
    ],
    ...sumTotals([
      {
        nutrition: correctNutrition("frango", "grelhado", 150)
      },
      {
        nutrition: correctNutrition("arroz", "cozido", 120)
      }
    ])
  };
}

// ========================================
// Função para chamar API HuggingFace
// ========================================
async function hfPost(model, buffer) {
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const headers = {
    Authorization: `Bearer ${HF_TOKEN}`,
    "Content-Type": "application/octet-stream"
  };
  const res = await axios.post(url, buffer, { headers, timeout: 20000 });
  return res.data;
}

module.exports = { recognizeImage };
