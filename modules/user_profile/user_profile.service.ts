import AppDataSource from "@/libs/typeorm";
import { UserProfileEntity } from "./user_profile.entity";
import { UserProfile, UserProfileSchema, SocialLinkItem } from "./user_profile.types";
import { DeepPartial } from "typeorm";
import AppDataSource from "@/libs/typeorm";

export default class UserProfileService {

  private static readonly repository = AppDataSource.getRepository(UserProfileEntity);

  static async getByUserId(userId: string): Promise<UserProfile | null> {
    const profile = await this.repository.findOne({
      where: { userId }
    });

    if (!profile) {
      return null;
    }

    return UserProfileSchema.parse(profile);
  }

  static async create(userId: string, data?: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.repository.findOne({
      where: { userId }
    });

    if (existing) {
      throw new Error("Profile already exists for this user");
    }

const profile = this.repository.create({
  userId,
  name: data?.name ?? null,
  biography: data?.biography ?? null,
  profilePicture: data?.profilePicture ?? null,
  headerImage: data?.headerImage ?? null,
  socialLinks: data?.socialLinks ?? []
} as DeepPartial<UserProfileEntity>);

    const saved = await this.repository.save(profile);
    return UserProfileSchema.parse(saved);
  }

  static async update(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const profile = await this.repository.findOne({
      where: { userId }
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    await this.repository.update({ userId }, {
      name: data.name ? data.name : undefined,
      biography: data.biography ? data.biography : undefined,
      profilePicture: data.profilePicture ? data.profilePicture : undefined,
      headerImage: data.headerImage ? data.headerImage : undefined,
      socialLinks: data.socialLinks
    });

    const updated = await this.repository.findOne({
      where: { userId }
    });

    return UserProfileSchema.parse(updated);
  }

  static async upsert(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.repository.findOne({
      where: { userId }
    });

    if (existing) {
      return this.update(userId, data);
    }

    return this.create(userId, data);
  }

  static async delete(userId: string): Promise<void> {
    const profile = await this.repository.findOne({
      where: { userId }
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    await this.repository.delete({ userId });
  }

  static async addSocialLink(userId: string, link: SocialLinkItem): Promise<UserProfile> {
    const profile = await this.repository.findOne({
      where: { userId }
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    const socialLinks = [...profile.socialLinks, link];
    await this.repository.update({ userId }, { socialLinks });

    const updated = await this.repository.findOne({
      where: { userId }
    });

    return UserProfileSchema.parse(updated);
  }

  static async removeSocialLink(userId: string, linkId: string): Promise<UserProfile> {
    const profile = await this.repository.findOne({
      where: { userId }
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    const socialLinks = profile.socialLinks.filter(link => link.id !== linkId);
    await this.repository.update({ userId }, { socialLinks });

    const updated = await this.repository.findOne({
      where: { userId }
    });

    return UserProfileSchema.parse(updated);
  }

  static async updateSocialLink(userId: string, linkId: string, data: Partial<SocialLinkItem>): Promise<UserProfile> {
    const profile = await this.repository.findOne({
      where: { userId }
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    const socialLinks = profile.socialLinks.map(link =>
      link.id === linkId ? { ...link, ...data } : link
    );

    await this.repository.update({ userId }, { socialLinks });

    const updated = await this.repository.findOne({
      where: { userId }
    });

    return UserProfileSchema.parse(updated);
  }
}
