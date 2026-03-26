import { Response } from 'express';

type ClientRole = 'student' | 'lecturer';

interface Client {
  id: string;
  res: Response;
  role: ClientRole;
}

interface StatsClient {
  id: string;
  res: Response;
}

interface CourseListClient {
  id: string;
  res: Response;
}

const clients: Map<string, Client[]> = new Map();
const statsClients: StatsClient[] = [];
const courseListClients: CourseListClient[] = [];

/**
 * Add a client to an SSE channel for a course.
 * Returns the clientId and the current anonymous student count.
 */
export function addClient(courseId: string, res: Response, role: ClientRole = 'student') {
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (!clients.has(courseId)) clients.set(courseId, []);
  clients.get(courseId)!.push({ id: clientId, res, role });

  res.on('close', () => removeClient(courseId, clientId));

  // Notify all connected clients about updated student count
  if (role === 'student') {
    const count = getStudentCount(courseId);
    sendEvent(courseId, 'student_joined', { anonymousCount: count });
  }

  sendStatsEvent('sse_presence_changed', {
    courseId,
    connected: getConnectedCount(courseId),
    students: getStudentCount(courseId),
  });

  return clientId;
}

export function removeClient(courseId: string, clientId: string) {
  const courseClients = clients.get(courseId);
  if (courseClients) {
    const removed = courseClients.find(c => c.id === clientId);
    const updated = courseClients.filter(c => c.id !== clientId);
    clients.set(courseId, updated);
    if (updated.length === 0) {
      clients.delete(courseId);
    } else if (removed?.role === 'student') {
      const count = getStudentCount(courseId);
      sendEvent(courseId, 'student_left', { anonymousCount: count });
    }

    sendStatsEvent('sse_presence_changed', {
      courseId,
      connected: getConnectedCount(courseId),
      students: getStudentCount(courseId),
    });
  }
}

export function sendEvent(courseId: string, event: string, data: any) {
  const courseClients = clients.get(courseId);
  if (courseClients) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    courseClients.forEach(client => {
      try {
        client.res.write(payload);
      } catch {
        // Client disconnected, will be cleaned up on 'close'
      }
    });
  }
}

/**
 * Send an event only to lecturers connected to a course channel.
 */
export function sendToLecturers(courseId: string, event: string, data: any) {
  const courseClients = clients.get(courseId);
  if (courseClients) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    courseClients.filter(c => c.role === 'lecturer').forEach(client => {
      try {
        client.res.write(payload);
      } catch {
        // ignore
      }
    });
  }
}

export function getStudentCount(courseId: string): number {
  const courseClients = clients.get(courseId);
  if (!courseClients) return 0;
  return courseClients.filter(c => c.role === 'student').length;
}

export function getConnectedCount(courseId: string): number {
  return clients.get(courseId)?.length ?? 0;
}

export function addStatsClient(res: Response) {
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  statsClients.push({ id: clientId, res });

  res.on('close', () => removeStatsClient(clientId));
  return clientId;
}

export function removeStatsClient(clientId: string) {
  const index = statsClients.findIndex((client) => client.id === clientId);
  if (index >= 0) {
    statsClients.splice(index, 1);
  }
}

export function sendStatsEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of statsClients) {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected, cleanup handled by close listener
    }
  }
}

export function addCourseListClient(res: Response) {
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  courseListClients.push({ id: clientId, res });

  res.on('close', () => removeCourseListClient(clientId));
  return clientId;
}

export function removeCourseListClient(clientId: string) {
  const index = courseListClients.findIndex((client) => client.id === clientId);
  if (index >= 0) {
    courseListClients.splice(index, 1);
  }
}

export function sendCourseListEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of courseListClients) {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected, cleanup handled by close listener
    }
  }
}