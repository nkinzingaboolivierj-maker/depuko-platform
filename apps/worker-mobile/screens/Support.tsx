/** Worker support (V7.4): open a real ticket and reply. Internal notes are
 * never visible here - filtered in SQL on the backend. */
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://depuko-api-production.up.railway.app/api/v1";

export default function Support({ token }: { token: string }) {
  const [category, setCategory] = useState("general");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  async function open() {
    try {
      const res = await fetch(`${BASE}/support/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? `failed (${res.status})`);
      setTicketId(body.ticketId);
    } catch (e) { Alert.alert("Failed", (e as Error).message); }
  }

  async function send() {
    if (!ticketId) return;
    try {
      const res = await fetch(`${BASE}/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: reply }),
      });
      if (!res.ok) throw new Error(`failed (${res.status})`);
      setReply("");
      Alert.alert("Sent");
    } catch (e) { Alert.alert("Send failed", (e as Error).message); }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h}>Support</Text>
      <TextInput style={s.input} placeholder="Category (general/payments/safety)" value={category} onChangeText={setCategory} />
      <Button title="Open ticket" onPress={open} />
      {ticketId && (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text>Ticket {ticketId}</Text>
          <TextInput style={s.area} placeholder="Your message" value={reply} onChangeText={setReply} multiline />
          <Button title="Send reply" onPress={send} disabled={reply.trim().length === 0} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  h: { fontSize: 20, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 },
  area: { borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8, minHeight: 80, textAlignVertical: "top" },
});