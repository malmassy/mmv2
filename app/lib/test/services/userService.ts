// User service for managing users

import { prisma } from '../../db/prisma';
import type { User } from '../types';

/**
 * Find or create a user by email
 */
export async function findOrCreateUser(email: string, name?: string): Promise<User> {
  // Try to find existing user
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name || undefined,
      isAdmin: existing.isAdmin,
      createdAt: existing.createdAt.getTime(),
      updatedAt: existing.updatedAt.getTime(),
    };
  }

  // Create new user
  const created = await prisma.user.create({
    data: {
      email,
      name,
    },
  });

  return {
    id: created.id,
    email: created.email,
    name: created.name || undefined,
    isAdmin: created.isAdmin,
    createdAt: created.createdAt.getTime(),
    updatedAt: created.updatedAt.getTime(),
  };
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  };
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  };
}

/**
 * Update user name
 */
export async function updateUserName(id: string, name: string): Promise<User> {
  const updated = await prisma.user.update({
    where: { id },
    data: { name },
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name || undefined,
    isAdmin: updated.isAdmin,
    createdAt: updated.createdAt.getTime(),
    updatedAt: updated.updatedAt.getTime(),
  };
}
