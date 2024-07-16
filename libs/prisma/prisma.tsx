import { PrismaClient as Orginal , User, Category, Post, Comment, Like, Tag, Project } from '@prisma/client';

const PrismaClient = new Orginal();

export type {
    User,
    Category,
    Post,
    Comment,
    Like,
    Tag,
    Project
}

export default {
    PrismaClient
}

