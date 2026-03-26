import { Request, Response } from 'express';
import { prisma } from '../server';
import { addClient, removeClient } from '../libs/sse.manager';
import { toFeedItem } from '../libs/transformers';
import { recordManualFeed, updateFeedMessage, deleteFeed } from '../services/feed.service';
import { getDefaultLecturerId } from '../libs/default-user';

export const getFeed = async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const feed = await prisma.feedPost.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(feed.map(toFeedItem));
};

export const createFeedPost = async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { message } = req.body;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ message: 'Course not found' });

  const authorId = await getDefaultLecturerId();
  const post = await recordManualFeed(courseId, authorId, message);
  res.status(201).json(post);
};

export const updateFeedPost = async (req: Request, res: Response) => {
  const { courseId, postId } = req.params;
  const { message } = req.body;

  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post || post.courseId !== courseId) return res.status(404).json({ message: 'Post not found' });

  const updated = await updateFeedMessage(postId, message);
  if (!updated) return res.status(404).json({ message: 'Post not found' });
  res.json(updated);
};

export const deleteFeedPost = async (req: Request, res: Response) => {
  const { courseId, postId } = req.params;
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post || post.courseId !== courseId) return res.status(404).json({ message: 'Post not found' });

  const deleted = await deleteFeed(postId);
  if (!deleted) return res.status(404).json({ message: 'Post not found' });
  res.status(204).send();
};

export const sseStream = (req: Request, res: Response) => {
  const { courseId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = addClient(courseId, res);

  res.write('event: ping\ndata: connected\n\n');

  req.on('close', () => {
    removeClient(courseId, clientId);
  });
};