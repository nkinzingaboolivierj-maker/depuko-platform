import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, View } from "react-native";
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
interface Opportunity { id: string; role: string; region: string; required_skills: string[]; compensation_cents: string | number; duration_days: number }
export default function Opportunities({ token }: { token: string }) {
  const [items, setItems] = useState<Opportunity[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  async function load() {
    try {
      const res = await fetch(`${BASE}/opportunities`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json(); if (!res.ok) throw new Error(body?.message ?? `failed (${res.status})`);
      setItems(body.opportunities ?? []);
    } catch (e) { Alert.alert("Could not load opportunities", (e as Error).message); setItems([]); }
  }
  async function apply(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`${BASE}/opportunities/${id}/applications`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json(); if (!res.ok) throw new Error(body?.message ?? `failed (${res.status})`);
      Alert.alert("Application submitted", `Current stage: ${body.applicationStage}. The server used your verified skills snapshot.`);
    } catch (e) { Alert.alert("Application failed", (e as Error).message); }
    finally { setBusyId(null); }
  }
  useEffect(() => { load(); }, [token]);
  return <View style={s.wrap}>
    <Text style={s.h}>Opportunities</Text>
    {items === null ? <ActivityIndicator /> : <FlatList data={items} keyExtractor={x => x.id} renderItem={({ item }) => (
      <View style={s.card}>
        <Text style={s.title}>{item.role}</Text><Text>{item.region} · {item.duration_days} days</Text>
        <Text>Required skills: {item.required_skills.join(", ")}</Text>
        <Text>Compensation: {(Number(item.compensation_cents) / 100).toLocaleString()} RWF</Text>
        <Button title="Apply" onPress={() => apply(item.id)} disabled={busyId === item.id} />
      </View>
    )} />}
    <Button title="Refresh" onPress={load} />
    <Text style={s.note}>Applications are advanced by authorized hiring teams, not by the applicant.</Text>
  </View>;
}
const s = StyleSheet.create({ wrap: { padding: 20, gap: 10, flex: 1 }, h: { fontSize: 20, fontWeight: "700" }, card: { padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, gap: 6, marginBottom: 10 }, title: { fontWeight: "700", fontSize: 16 }, note: { color: "#666", fontSize: 12 } });
