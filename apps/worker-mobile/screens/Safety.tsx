/** Worker safety incident reporting. Submits directly to the API; an internet connection is required. */
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://depuko-api-production.up.railway.app/api/v1";

export default function Safety({ token }: { token: string }) {
  const [description, setDescription] = useState("");

  async function report() {
    try {
      const res = await fetch(`${BASE}/trust/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind: "safety_incident", subjectId: "me", description }),
      });
      if (!res.ok) throw new Error(`failed (${res.status})`);
      Alert.alert("Reported", "Your safety report was recorded and routed to human review.");
      setDescription("");
    } catch (e) { Alert.alert("Report failed", (e as Error).message); }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h}>Report a safety incident</Text>
      <TextInput style={s.area} multiline placeholder="What happened?" value={description} onChangeText={setDescription} />
      <Button title="Submit report" onPress={report} disabled={description.trim().length === 0} color="#06152A" />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  h: { fontSize: 20, fontWeight: "700", color: "#06152A" },
  area: { borderWidth: 1, borderColor: "#dbe3ef", padding: 12, borderRadius: 8, minHeight: 100, textAlignVertical: "top" },
});
