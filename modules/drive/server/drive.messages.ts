/** User-facing error messages for the Drive module. */
const DriveMessages = {
  NOT_FOUND: 'File or folder not found.',
  PARENT_NOT_FOUND: 'Destination folder not found.',
  PARENT_NOT_FOLDER: 'Destination is not a folder.',
  NAME_TAKEN: 'An item with this name already exists in this folder.',
  NAME_REQUIRED: 'A name is required.',
  NOT_A_FOLDER: 'This item is not a folder.',
  CANNOT_MOVE_INTO_SELF: 'A folder cannot be moved into itself or its descendants.',
  FORBIDDEN: 'You do not have access to this item.',
  FORBIDDEN_MANAGE: 'Only the owner can share or delete this item.',
  NOT_IN_TRASH: 'This item is not in the trash.',
  ALREADY_SHARED: 'This item is already shared with that user.',
  CANNOT_SHARE_FOLDER_PUBLIC: 'Public links are only supported for files.',
  PUBLIC_LINK_INVALID: 'This link is invalid or has expired.',
  SYSTEM_READ_ONLY: 'System files are read-only here.',
  ADMIN_ONLY: 'Only tenant admins can view system files.',
  ACTION_NOT_FOUND: 'No such action is available for this file.',
} as const;

export default DriveMessages;
