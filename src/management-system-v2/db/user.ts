'use server';
import db from '@/db';
import { User } from '@prisma/client';

export async function createUser(data: User) {
  try {
    const user = await db.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        guest: data.guest || false,
        emailVerified: data.emailVerified || false,
      },
    });
    return user;
  } catch (error) {
    throw new Error(`Error creating user: ${error}`);
  }
}

export async function getUserById(id: string) {
  try {
    const user = await db.user.findUnique({
      where: {
        id,
      },
    });
    return user;
  } catch (error) {
    throw new Error(`Error getting user by ID: ${error}`);
  }
}

export async function updateUser(id: string, data: Partial<User>) {
  try {
    const user = await db.user.update({
      where: {
        id,
      },
      data,
    });
    return user;
  } catch (error) {
    throw new Error(`Error updating user: ${error}`);
  }
}

export async function deleteUser(id: string) {
  try {
    const user = await db.user.delete({
      where: {
        id,
      },
    });
    return user;
  } catch (error) {
    throw new Error(`Error deleting user: ${error}`);
  }
}
