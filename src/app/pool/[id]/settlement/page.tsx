import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { SettlementClient } from "./SettlementClient";
import type { Pool, PoolPayout } from "@/types";

export default async function SettlementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/auth/login");

  const { data: pool } = await supabase
    .from("pools")
    .select("*, tournament:tournaments(name, course)")
    .eq("id", id)
    .single<Pool & { tournament: { name: string; course: string } }>();

  if (!pool) redirect("/");

  const isAdmin = pool.organizer_id === authUser.id;

  const { data: payouts } = await supabase
    .from("pool_payouts")
    .select("*")
    .eq("pool_id", id)
    .order("category", { ascending: true });

  // Get user info for payout recipients
  const userIds = Array.from(new Set((payouts ?? []).map((p) => p.user_id)));
  const { data: users } = userIds.length > 0
    ? await supabase.from("users").select("id, display_name").in("id", userIds)
    : { data: [] };

  const usersMap = Object.fromEntries((users ?? []).map((u: { id: string; display_name: string }) => [u.id, u.display_name]));

  return (
    <>
      <NavBar poolName={pool.name} isAdmin={isAdmin} />
      <SettlementClient
        pool={pool}
        payouts={(payouts ?? []) as PoolPayout[]}
        usersMap={usersMap}
        isAdmin={isAdmin}
        poolId={id}
        authUserId={authUser.id}
      />
    </>
  );
}
