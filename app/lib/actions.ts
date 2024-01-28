'use server';

import { signIn } from '@/auth';
import { sql } from '@vercel/postgres';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const revalidatedPath = '/dashboard/invoices';

const FormData = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please Select a Customer',
  }),
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount > $0. ' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

// omit remove some keys when we want to validate obj_data
const CreateInvoice = FormData.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  // validate form input before sending them to the DB
  if (!validatedFields.success)
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failde to create invoice.',
    };

  // Prepare data for insertion into the DB
  const { amount, customerId, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    return { message: `DB Error: Failed to Create Invoice, Error: ${error}` };
  }

  revalidatePath(revalidatedPath); // refresh the routes with its copmemnets to reflect changes happend in DB
  redirect(revalidatedPath);
}

const UpdateInvoice = FormData.omit({ id: true, date: true });

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Validate form inputs before editing them to DB.
  if (!validatedFields.success)
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to update the invoice',
    };

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`
  UPDATE invoices
  SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
  WHERE id = ${id}
    `;
  } catch (error) {
    return {
      message: `DB Error: Failed to Update Invoice with Id:${id}, Error: ${error}`,
    };
  }
  revalidatePath(revalidatedPath);
  redirect(revalidatedPath);
}

export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
  } catch (error) {
    return {
      message: `DB Error: Failed to Delete Invoice with id:${id}, Error: ${error}`,
    };
  }
}
//  User actions

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong!';
      }
    }
    throw error;
  }
}
