'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const revalidatedPath = '/dashboard/invoices';

const FormData = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

// omit remove some keys when we want to validate obj_data
const CreateInvoice = FormData.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
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
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
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
  throw new Error('faild to delete Invoice');

  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
  } catch (error) {
    return {
      message: `DB Error: Failed to Delete Invoice with id:${id}, Error: ${error}`,
    };
  }
}
