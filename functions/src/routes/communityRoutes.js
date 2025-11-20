const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

const db = () => admin.firestore();

/**
 * POST /community/:userId/posts
 * Body: { text, imageUrl, totalCalories, totalProtein, totalCarbs, totalFat }
 */
router.post('/:userId/posts', async (req, res) => {
  const { userId } = req.params;
  const { text, imageUrl, totalCalories, totalProtein, totalCarbs, totalFat } = req.body;

  if (!text && !imageUrl) {
    return res.status(400).json({ error: 'Post precisa de texto ou imagem.' });
  }

  try {
    const userRef = db().collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userName = userSnap.exists ? (userSnap.data().name || 'Usuário') : 'Usuário';

    const docRef = await db().collection('posts').add({
      userId,
      userName,
      text: text || '',
      imageUrl: imageUrl || null,
      totalCalories: totalCalories || null,
      totalProtein: totalProtein || null,
      totalCarbs: totalCarbs || null,
      totalFat: totalFat || null,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ id: docRef.id });
  } catch (err) {
    console.error('Erro ao criar post:', err);
    res.status(500).json({ error: 'Não foi possível criar o post.' });
  }
});

/**
 * GET /community/feed
 * Query: ?limit=20&startAfter=timestampISO
 */
router.get('/feed', async (req, res) => {
  const requestedLimit = parseInt(req.query.limit || '20', 10);
  const limit = Number.isNaN(requestedLimit)
    ? 20
    : Math.max(1, Math.min(requestedLimit, 50));
  const startAfter = req.query.startAfter;

  try {
    let query = db()
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    const snap = await query.get();
    const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const nextCursor =
      posts.length === limit && posts.length > 0 ? posts[posts.length - 1].createdAt : null;

    res.json({ posts, nextCursor });
  } catch (err) {
    console.error('Erro ao carregar feed:', err);
    res.status(500).json({ error: 'Não foi possível carregar o feed.' });
  }
});

/**
 * POST /community/:postId/like
 * Body: { userId }
 */
router.post('/:postId/like', async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório.' });

  try {
    const likeRef = db().collection('post_likes').doc(`${postId}_${userId}`);
    const likeSnap = await likeRef.get();
    if (likeSnap.exists) {
      return res.status(200).json({ success: true, alreadyLiked: true });
    }

    const batch = db().batch();
    batch.set(likeRef, {
      postId,
      userId,
      createdAt: new Date().toISOString(),
    });

    const postRef = db().collection('posts').doc(postId);
    batch.update(postRef, {
      likesCount: admin.firestore.FieldValue.increment(1),
    });

    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao dar like:', err);
    res.status(500).json({ error: 'Não foi possível curtir o post.' });
  }
});

/**
 * DELETE /community/:postId/like
 * Body: { userId }
 */
router.delete('/:postId/like', async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório.' });

  try {
    const likeRef = db().collection('post_likes').doc(`${postId}_${userId}`);
    const likeSnap = await likeRef.get();
    if (!likeSnap.exists) {
      return res.status(200).json({ success: true, alreadyRemoved: true });
    }

    const batch = db().batch();
    batch.delete(likeRef);

    const postRef = db().collection('posts').doc(postId);
    batch.update(postRef, {
      likesCount: admin.firestore.FieldValue.increment(-1),
    });

    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao remover like:', err);
    res.status(500).json({ error: 'Não foi possível remover o like.' });
  }
});

/**
 * POST /community/:postId/comments
 * Body: { userId, text }
 */
router.post('/:postId/comments', async (req, res) => {
  const { postId } = req.params;
  const { userId, text } = req.body;
  if (!userId || !text) {
    return res.status(400).json({ error: 'userId e text são obrigatórios.' });
  }

  try {
    const userRef = db().collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userName = userSnap.exists ? (userSnap.data().name || 'Usuário') : 'Usuário';

    const batch = db().batch();

    const commentRef = db().collection('post_comments').doc();
    batch.set(commentRef, {
      postId,
      userId,
      userName,
      text,
      createdAt: new Date().toISOString(),
    });

    const postRef = db().collection('posts').doc(postId);
    batch.update(postRef, {
      commentsCount: admin.firestore.FieldValue.increment(1),
    });

    await batch.commit();

    res.status(201).json({ id: commentRef.id });
  } catch (err) {
    console.error('Erro ao comentar:', err);
    res.status(500).json({ error: 'Não foi possível adicionar comentário.' });
  }
});

/**
 * GET /community/:postId/comments
 */
router.get('/:postId/comments', async (req, res) => {
  const { postId } = req.params;
  try {
    const snap = await db()
      .collection('post_comments')
      .where('postId', '==', postId)
      .orderBy('createdAt', 'asc')
      .get();

    const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ comments });
  } catch (err) {
    console.error('Erro ao listar comentários:', err);
    res.status(500).json({ error: 'Não foi possível listar comentários.' });
  }
});

module.exports = router;
