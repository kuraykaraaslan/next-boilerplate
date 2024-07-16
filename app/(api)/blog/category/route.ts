"use server";
import { NextResponse, NextRequest } from "next/server";
import BlogCategoryService from '@/services/BlogCategoryService';
import { Category } from '@prisma/client';

type ResponseData = {
    message: any  
}

const blogCategoryService = new BlogCategoryService();
import { auth } from '@/auth';
import { User } from '@prisma/client';


export async function POST(request: NextRequest, response: NextResponse<ResponseData>) {
   
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as User;
    
    if (!user.role || user.role !== 'ADMIN') {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { title, description, slug } = await request.json();

        if (!title || !description || !slug) {
            return NextResponse.json({ message: "Please fill in the required fields." }, { status: 400 });
        }

        const res = await blogCategoryService.createCategory({
            id : '',
            title,
            description,
            slug,
            createdAt: new Date(), // Add the missing createdAt property
            updatedAt: new Date() // Add the missing updatedAt property
        }, user);

        return NextResponse.json(res);
    }

    catch (error) {
        console.error(error);
        return NextResponse.json({ message: "An error occurred" }, { status: 500 });
    }
}

export async function GET(request: NextRequest, response: NextResponse<ResponseData>) {
    try {
        const { searchParams } = new URL(request.url);
        
        var page = searchParams.get('page') || 1;
        var limit = searchParams.get('limit') || 10;

        if (!page) {
            page = 1;
        }

        if (!limit) {
            limit = 10;
        }

        const categories = await blogCategoryService.getCategories({ page: Number(page), limit: Number(limit) });

        return NextResponse.json(categories);

    }

    catch (error) {
        console.error(error);
        return NextResponse.json({ message: "An error occurred" }, { status: 500 });
    }

}

export async function PUT(request: NextRequest, response: NextResponse<ResponseData>) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as User;
    
    if (!user.role || user.role !== 'ADMIN') {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, title, description, slug } = await request.json();

        if (!id) {
            return NextResponse.json({ message: "Please provide the category id." }, { status: 400 });
        }

        if (!title || !description || !slug) {
            return NextResponse.json({ message: "Please fill in the required fields." }, { status: 400 });
        }

        const res = await blogCategoryService.updateCategory({
            id,
            title,
            description,
            slug,
            createdAt: new Date(), // Add the missing createdAt property
            updatedAt: new Date() // Add the missing updatedAt property
        }, user);

        return NextResponse.json(res);
    }

    catch (error) {
        console.error(error);
        return NextResponse.json({ message: "An error occurred" }, { status: 500 });
    }
}


export async function DELETE(request: NextRequest, response: NextResponse<ResponseData>) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as User;
    
    if (!user.role || user.role !== 'ADMIN') {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ message: "Please provide the category id." }, { status: 400 });
        }

        const res = await blogCategoryService.deleteCategory(id, user);

        return NextResponse.json(res);
    }

    catch (error) {
        console.error(error);
        return NextResponse.json({ message: "An error occurred" }, { status: 500 });
    }
}