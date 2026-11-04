import { redirect } from "next/navigation";

// Legacy URL; health is now a section of Products.
export default function AdminHealthRedirect(): never {
  redirect("/admin/products");
}
