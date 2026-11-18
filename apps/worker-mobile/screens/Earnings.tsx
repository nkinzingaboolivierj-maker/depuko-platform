/** Worker earnings + payout history (V7.4). Payouts are admin-released
 * (payouts:release) - this screen only READS the authoritative state; it
 * never promises money that has not been released. */
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

interface Payout { id: string; status: string; amount_cents: string }

export default function Earnings({ token }: { token: string }) {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);

  useEffect(() => {
    fetch(`${BASE}/payouts/mine`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : { payouts: [] }))
      .then((b: { payouts?: Payout[] }) => setPayouts(b.payouts ?? []))
      .catch(() => setPayouts([]));
  }, [token]);

  return (
    <View style={s.wrap}>
      <Text style={s.h}>Earnings & payouts</Text>
      {payouts === null ? <ActivityIndicator /> : payouts.length === 0 ? (
        <Text>No payouts yet. Payouts are released after work completion and admin approval.</Text>
      ) : (
        payouts.map(p => (
          <View key={p.id} style={s.row}>
            <Text>{p.id}</Text>
            <Text>{p.status} - {(Number(p.amount_cents) / 100).toLocaleString()} RWF</Text>
          </View>
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  h: { fontSize: 20, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", padding: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
});