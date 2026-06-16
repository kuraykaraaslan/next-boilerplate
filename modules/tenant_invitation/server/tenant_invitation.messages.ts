const TenantInvitationMessages = {
  INVITATION_NOT_FOUND: "Invitation not found",
  INVITATION_ALREADY_SENT: "An active invitation has already been sent to this email",
  INVITATION_EXPIRED: "This invitation has expired",
  INVITATION_ALREADY_ACCEPTED: "This invitation has already been accepted",
  INVITATION_ALREADY_DECLINED: "This invitation has already been declined",
  INVITATION_REVOKED: "This invitation has been revoked",
  INVITATION_INVALID_TOKEN: "Invalid invitation token",
  INVITATION_EMAIL_MISMATCH: "This invitation was sent to a different email address",
  INVITATION_ALREADY_MEMBER: "This user is already a member of this tenant",
  INVITATION_SENT: "Invitation sent successfully",
  INVITATION_ACCEPTED: "Invitation accepted successfully",
  INVITATION_DECLINED: "Invitation declined successfully",
  INVITATION_REVOKED_SUCCESS: "Invitation revoked successfully",
  INVITATION_ONLY_PENDING_CAN_BE_REVOKED: "Only pending invitations can be revoked",
  INVITATION_ROLE_NOT_ALLOWED: "This role cannot be granted via invitation",
  INVITATION_ONLY_PENDING_CAN_BE_RESENT: "Only pending invitations can be resent",
} as const;

export default TenantInvitationMessages;
