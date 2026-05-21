import { redirect } from "next/navigation";

export default function Home() {
  redirect("/ru"); // Можно заменить на /en или /uz, если нужен другой defaultLocale
  return null;
}
