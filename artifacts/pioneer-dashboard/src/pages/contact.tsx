import { useState } from "react";
import { useSendEmail } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Users } from "lucide-react";

const PIONEER_RECIPIENTS = [
  "Taylor Vincent",
  "Shane Parks",
  "Paul Hester",
  "Hank Pennington",
];

const ICC_SENDERS = [
  { name: "Daniel Vass", email: "dvass@iccinternational.com" },
  { name: "Sharon Crisp", email: "scrisp@iccinternational.com" },
];

export default function Contact() {
  const { toast } = useToast();
  const sendEmail = useSendEmail();

  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function fillSender(name: string, email: string) {
    setFromName(name);
    setFromEmail(email);
  }

  function handleSend() {
    if (!fromName.trim() || !fromEmail.trim() || !subject.trim() || !message.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }

    sendEmail.mutate({ fromName, fromEmail, subject, message }, {
      onSuccess: () => {
        toast({ title: "Message sent to Pioneer team" });
        setSubject("");
        setMessage("");
      },
      onError: () => {
        toast({
          title: "Could not send email",
          description: "SMTP is not configured on this server. Contact your administrator.",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Message Pioneer</h1>
        <p className="text-muted-foreground mt-1">Send a message directly to the Pioneer Industrial Sales team.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-muted-foreground" /> Recipients
          </CardTitle>
          <CardDescription>This message will be sent to all 4 Pioneer contacts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PIONEER_RECIPIENTS.map((name) => (
              <div key={name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-sm">
                <Mail className="w-3 h-3 text-muted-foreground" />
                {name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>From</Label>
            <div className="flex gap-2 flex-wrap">
              {ICC_SENDERS.map((s) => (
                <Button
                  key={s.email}
                  type="button"
                  size="sm"
                  variant={fromEmail === s.email ? "default" : "outline"}
                  onClick={() => fillSender(s.name, s.email)}
                >
                  {s.name}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Your Name</Label>
                <Input placeholder="Daniel Vass" value={fromName} onChange={(e) => setFromName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Your Email</Label>
                <Input type="email" placeholder="dvass@iccinternational.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Subject</Label>
            <Input
              placeholder="e.g. Question about AVSM 0.040 inventory"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Message</Label>
            <Textarea
              placeholder="Type your message to the Pioneer team..."
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <Button
            className="w-full flex items-center gap-2"
            onClick={handleSend}
            disabled={sendEmail.isPending}
          >
            <Send className="w-4 h-4" />
            {sendEmail.isPending ? "Sending..." : "Send to Pioneer Team"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
