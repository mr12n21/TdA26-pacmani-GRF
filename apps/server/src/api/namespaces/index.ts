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


router.post(
  '/namespaces/request',
  authMiddleware,
  namespacesCtrl.requestNewOrganizationHandler
);

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


router.post(
  '/namespaces/:namespaceId/members/add',
  authMiddleware,
  namespaceMiddleware,
  rolesMiddleware(['SUPER_ADMIN', 'ORG_ADMIN']),
  namespacesCtrl.addMemberDirectlyHandler
);

router.get(
  '/namespaces/:namespaceId/members/search',
  authMiddleware,
  namespaceMiddleware,
  rolesMiddleware(['SUPER_ADMIN', 'ORG_ADMIN']),
  namespacesCtrl.searchUsersForNamespaceHandler
);

router.get(
  '/namespaces/:namespaceId/quizzes',
  authMiddleware,

  namespaceMiddleware,
  namespacesCtrl.listNamespaceQuizzesHandler
);

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


router.post(
  '/invite/:token',
  authMiddleware,
  namespacesCtrl.joinViaInviteLinkHandler
);

export default router;
