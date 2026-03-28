import express from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { rolesMiddleware } from '../../middleware/roles.middleware';
import { namespaceMiddleware } from '../../middleware/namespace.middleware';
import { validationMiddleware } from '../../middleware/validation.middleware';
import * as namespacesCtrl from '../../controllers/namespaces.controller';
import {
  namespaceCreateSchema,
  namespaceUpdateSchema,
  membershipRequestSchema,
  membershipStatusUpdateSchema,
  inviteLinkCreateSchema,
} from '../../models/schemas';

const router = express.Router();

// ─── Organization Request (Regular users) ────────────────────────────

router.post(
  '/namespaces/request',
  authMiddleware,
  namespacesCtrl.requestNewOrganizationHandler
);

// ─── Namespace Management (SUPER_ADMIN only) ─────────────────────────

router.post(
  '/namespaces',
  authMiddleware,
  rolesMiddleware(['SUPER_ADMIN']),
  validationMiddleware(namespaceCreateSchema),
  namespacesCtrl.createNamespaceHandler
);

router.get(
  '/namespaces',
  authMiddleware,
  namespacesCtrl.listNamespacesHandler
);

router.get(
  '/namespaces/:namespaceId',
  authMiddleware,
  namespaceMiddleware,
  namespacesCtrl.getNamespaceHandler
);

router.patch(
  '/namespaces/:namespaceId',
  authMiddleware,
  rolesMiddleware(['SUPER_ADMIN']),
  validationMiddleware(namespaceUpdateSchema),
  namespacesCtrl.updateNamespaceHandler
);

router.delete(
  '/namespaces/:namespaceId',
  authMiddleware,
  rolesMiddleware(['SUPER_ADMIN']),
  namespacesCtrl.deleteNamespaceHandler
);

// ─── Namespace Members Management ────────────────────────────────────

router.get(
  '/namespaces/:namespaceId/members',
  authMiddleware,
  namespaceMiddleware,
  rolesMiddleware(['SUPER_ADMIN', 'ORG_ADMIN']),
  namespacesCtrl.listMembersHandler
);

router.post(
  '/namespaces/:namespaceId/members',
  authMiddleware,
  validationMiddleware(membershipRequestSchema),
  namespacesCtrl.requestMembershipHandler
);

router.patch(
  '/namespaces/:namespaceId/members/:memberId',
  authMiddleware,
  namespaceMiddleware,
  rolesMiddleware(['SUPER_ADMIN', 'ORG_ADMIN']),
  validationMiddleware(membershipStatusUpdateSchema),
  namespacesCtrl.updateMembershipStatusHandler
);

router.delete(
  '/namespaces/:namespaceId/members/:memberId',
  authMiddleware,
  namespaceMiddleware,
  rolesMiddleware(['SUPER_ADMIN', 'ORG_ADMIN']),
  namespacesCtrl.removeMemberHandler
);

// ─── Direct Member Add (admin adds user directly) ───────────────────

router.post(
  '/namespaces/:namespaceId/members/add',
  authMiddleware,
  namespaceMiddleware,
  rolesMiddleware(['SUPER_ADMIN', 'ORG_ADMIN']),
  namespacesCtrl.addMemberDirectlyHandler
);

// ─── Search users to add to namespace ────────────────────────────────

router.get(
  '/namespaces/:namespaceId/members/search',
  authMiddleware,
  namespaceMiddleware,
  rolesMiddleware(['SUPER_ADMIN', 'ORG_ADMIN']),
  namespacesCtrl.searchUsersForNamespaceHandler
);

// ─── Namespace Quizzes (all quizzes across courses in namespace) ─────

router.get(
  '/namespaces/:namespaceId/quizzes',
  authMiddleware,
  namespaceMiddleware,
  namespacesCtrl.listNamespaceQuizzesHandler
);

// ─── Invite Links ────────────────────────────────────────────────────

router.post(
  '/namespaces/:namespaceId/invite',
  authMiddleware,
  namespaceMiddleware,
  rolesMiddleware(['LECTURER', 'ORG_ADMIN']),
  validationMiddleware(inviteLinkCreateSchema),
  namespacesCtrl.createInviteLinkHandler
);

router.get(
  '/namespaces/:namespaceId/invite',
  authMiddleware,
  namespaceMiddleware,
  rolesMiddleware(['LECTURER', 'ORG_ADMIN']),
  namespacesCtrl.listInviteLinksHandler
);

router.delete(
  '/namespaces/:namespaceId/invite/:inviteLinkId',
  authMiddleware,
  namespaceMiddleware,
  rolesMiddleware(['LECTURER', 'ORG_ADMIN']),
  namespacesCtrl.deleteInviteLinkHandler
);

// ─── Public Invite Entry (auth required to join) ─────────────────────

router.post(
  '/invite/:token',
  authMiddleware,
  namespacesCtrl.joinViaInviteLinkHandler
);

export default router;
