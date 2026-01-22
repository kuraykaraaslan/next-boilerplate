import { prisma } from "@/libs/prisma";
import { UserProfile, UserProfileSchema, SocialLinkItem } from "./user_profile.types";

export default class UserProfileService {

  static async getByUserId(userId: string): Promise<UserProfile | null> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return null;
    }

    return UserProfileSchema.parse(profile);
  }

  static async create(userId: string, data?: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (existing) {
      throw new Error("Profile already exists for this user");
    }

    const profile = await prisma.userProfile.create({
      data: {
        userId,
        name: data?.name ?? null,
        biography: data?.biography ?? null,
        profilePicture: data?.profilePicture ?? null,
        headerImage: data?.headerImage ?? null,
        socialLinks: data?.socialLinks ?? []
      }
    });

    return UserProfileSchema.parse(profile);
  }

  static async update(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    const updated = await prisma.userProfile.update({
      where: { userId },
      data: {
        name: data.name ? data.name : undefined,
        biography: data.biography ? data.biography : undefined,
        profilePicture: data.profilePicture ? data.profilePicture : undefined,
        headerImage: data.headerImage ? data.headerImage : undefined,
        socialLinks: data.socialLinks
      }
    });

    return UserProfileSchema.parse(updated);
  }

  static async upsert(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        name: data.name ? data.name : undefined,
        biography: data.biography ? data.biography : undefined,
        profilePicture: data.profilePicture ? data.profilePicture : undefined,
        headerImage: data.headerImage ? data.headerImage : undefined,
        socialLinks: data.socialLinks
      },
      create: {
        userId,
        name: data?.name ?? null,
        biography: data?.biography ?? null,
        profilePicture: data?.profilePicture ?? null,
        headerImage: data?.headerImage ?? null,
        socialLinks: data?.socialLinks ?? []
      }
    });

    return UserProfileSchema.parse(profile);
  }

  static async delete(userId: string): Promise<void> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    await prisma.userProfile.delete({ where: { userId } });
  }

  static async addSocialLink(userId: string, link: SocialLinkItem): Promise<UserProfile> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    const socialLinks = [...(profile.socialLinks as SocialLinkItem[]), link];

    const updated = await prisma.userProfile.update({
      where: { userId },
      data: { socialLinks }
    });

    return UserProfileSchema.parse(updated);
  }

  static async removeSocialLink(userId: string, linkId: string): Promise<UserProfile> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    const socialLinks = (profile.socialLinks as SocialLinkItem[]).filter(link => link.id !== linkId);

    const updated = await prisma.userProfile.update({
      where: { userId },
      data: { socialLinks }
    });

    return UserProfileSchema.parse(updated);
  }

  static async updateSocialLink(userId: string, linkId: string, data: Partial<SocialLinkItem>): Promise<UserProfile> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    const socialLinks = (profile.socialLinks as SocialLinkItem[]).map(link =>
      link.id === linkId ? { ...link, ...data } : link
    );

    const updated = await prisma.userProfile.update({
      where: { userId },
      data: { socialLinks }
    });

    return UserProfileSchema.parse(updated);
  }
}
