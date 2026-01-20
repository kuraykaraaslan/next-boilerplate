
import { NextResponse } from "next/server";
import UserService from "@/modules/user/user.service";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import { UpdateUserRequestSchema } from "@/modules/user/user.dto";
import UserMessages from "@/modules/user/user.messages";

/**
 * GET handler for retrieving a user by its ID.
 * @param request - The incoming request object
 * @param context - Contains the URL parameters, including userId
 * @returns A NextResponse containing the user data or an error message
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {


  try {

    const { userId } = await params

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "USER" });

    const user = await UserService.getById(userId);

    if (!user) {
      return NextResponse.json(
        { message: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });

  }
  catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting a user by its ID.
 * @param request - The incoming request object
 * @param context - Contains the URL parameters, including userId
 * @returns A NextResponse containing a success message or an error message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const { userId } = await params

    const user = await UserService.getById(userId);

    if (!user) {
      return NextResponse.json(
        { message: UserMessages.USER_NOT_FOUND },
        { status: 404 }
      );
    }

    await UserService.delete(userId);

    return NextResponse.json(
      { message: UserMessages.USER_DELETED_SUCCESSFULLY },
    );
  }
  catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating a user by its ID.
 * @param request - The incoming request object
 * @param context - Contains the URL parameters, including userId
 * @returns A NextResponse containing the updated user data or an error message
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const { userId } = await params

    const data = await request.json();

    console.log("Received data for update:", data);

    const parsedData = UpdateUserRequestSchema.safeParse(data);

    if (!parsedData.success) {
      return NextResponse.json(
        { message: parsedData.error
        { status: 400 }
      );
    }

    const updatedUser = await UserService.update({ userId, data: parsedData.data });

    if (!updatedUser) {
      return NextResponse.json(
        { message: UserMessages.USER_NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: updatedUser });

  }
  catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}