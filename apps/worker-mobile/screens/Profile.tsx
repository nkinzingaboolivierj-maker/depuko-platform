/** Worker profile + skills claim (V7.3 section D). Real endpoints; a claim is
 * self-declared until a human verifies it - the UI states that honestly. */
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://depuko-api-production.up.railway.app/api/v1";

export default function Profile({ token }: { token: string }) {
  const [headline, setHeadline] = useState("");
  const [skill, setSkill] = useState("");
  const [verified, setVerified] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function createProfile() {
    setBusy(true);
    try {
      const res = await fetch(`${BASE}/workforce/me/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ headline, country: "RW" }),
      });
      if (!res.ok) throw new Error(`failed (${res.status})`);
      Alert.alert("Profile saved");
    } catch (e) { Alert.alert("Save failed", (e as Error).message); }
    finally { setBusy(false); }
  }

  async function claimSkill() {
    try {
      const res = await fetch(`${BASE}/skills/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ skillId: skill }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? "claim failed");
      Alert.alert("Claimed", `Skill is ${body.verification} - a human reviewer must verify it.`);
    } catch (e) { Alert.alert("Claim failed", (e as Error).message); }
  }

  async function loadVerified() {
    try {
      const res = await fetch(`${BASE}/skills/workers/me/verified`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setVerified((await res.json()).map((v: { skill_id: string }) => v.skill_id));
    } catch { setVerified([]); }
  }

  useEffect(() => { loadVerified(); }, []);

  return (
    <View style={s.wrap}>
      <Text style={s.h}>Profile</Text>
      <TextInput style={s.input} placeholder="Headline (e.g. Professional groomer)" value={headline} onChangeText={setHeadline} />
      {busy ? <ActivityIndicator /> : <Button title="Save profile" onPress={createProfile} />}
      <View style={{ height: 16 }} />
      <TextInput style={s.input} placeholder="Skill id to claim" value={skill} onChangeText={setSkill} autoCapitalize="none" />
      <Button title="Claim skill" onPress={claimSkill} />
      <View style={{ height: 16 }} />
      <Text style={s.h}>Verified skills</Text>
      {verified === null ? <ActivityIndicator /> : <Text>{verified.length === 0 ? "None verified yet." : verified.join(", ")}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  h: { fontSize: 20, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 },
});