import { FeedType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { sendEvent } from '../libs/sse.manager';
import { toFeedItem } from '../libs/transformers';
import { prisma } from '../server';

export const recordSystemFeed = async (courseId: string, message: string, meta?: any) => {
	const course = await prisma.course.findUnique({ where: { id: courseId }, select: { namespaceId: true } });
	if (!course) throw new Error('Course not found');
	
	const post = await prisma.feedPost.create({
		data: { id: uuidv4(), courseId, namespaceId: course.namespaceId, content: message, type: FeedType.AUTO, meta },
	});
	const payload = toFeedItem(post);
	sendEvent(courseId, 'new_post', payload);
	return payload;
};

export const recordManualFeed = async (courseId: string, authorId: string | null, message: string) => {
	const course = await prisma.course.findUnique({ where: { id: courseId }, select: { namespaceId: true } });
	if (!course) throw new Error('Course not found');
	
	const post = await prisma.feedPost.create({
		data: { id: uuidv4(), courseId, namespaceId: course.namespaceId, authorId: authorId ?? undefined, content: message, type: FeedType.MANUAL },
	});
	const payload = toFeedItem(post);
	sendEvent(courseId, 'new_post', payload);
	return payload;
};

export const updateFeedMessage = async (postId: string, message: string) => {
	const existing = await prisma.feedPost.findUnique({ where: { id: postId } });
	if (!existing) return null;
	const post = await prisma.feedPost.update({ where: { id: postId }, data: { content: message, edited: true } });
	const payload = toFeedItem(post);
	sendEvent(post.courseId, 'updated_post', payload);
	return payload;
};

export const deleteFeed = async (postId: string) => {
	const post = await prisma.feedPost.findUnique({ where: { id: postId } });
	if (!post) return null;
	await prisma.feedPost.delete({ where: { id: postId } });
	sendEvent(post.courseId, 'deleted_post', { uuid: postId });
	return post;
};
