import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
export const metadata: Metadata = { title: "Owner workspace", robots: { index: false, follow: false } };
export default function AdminPage() { return <AdminDashboard />; }
