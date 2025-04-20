"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminNav from "./AdminNav";

type Role = "ADMIN" | "USER" | "TEKNISK" | "VEKTREG" | "INNSJEKK" | "POWERLOG";

export function AddUser() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const utils = api.useUtils();

  const createUser = api.user.create.useMutation({
    onSuccess: () => {
      setSuccess("Bruker opprettet!");
      setEmail("");
      setPassword("");
      setName("");
      setRole("USER");
      setError(null);
      void utils.user.getAll.invalidate();
    },
    onError: (error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password || !name) {
      setError("Vennligst fyll ut alle felt");
      return;
    }

    createUser.mutate({
      email,
      password,
      name,
      role,
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Navn</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Fornavn Etternavn"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="bruker@eksempel.no"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Passord</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Rolle</Label>
        <Select value={role} onValueChange={(value: Role) => setRole(value)}>
          <SelectTrigger className="bg-white w-full">
            <SelectValue placeholder="Velg rolle" />
          </SelectTrigger>
          <SelectContent className="bg-white z-[100]">
            <SelectItem value="USER" className="cursor-pointer hover:bg-gray-100">Bruker</SelectItem>
            <SelectItem value="ADMIN" className="cursor-pointer hover:bg-gray-100">Administrator</SelectItem>
            <SelectItem value="TEKNISK" className="cursor-pointer hover:bg-gray-100">Teknisk</SelectItem>
            <SelectItem value="VEKTREG" className="cursor-pointer hover:bg-gray-100">Vektreg</SelectItem>
            <SelectItem value="INNSJEKK" className="cursor-pointer hover:bg-gray-100">Innsjekk</SelectItem>
            <SelectItem value="POWERLOG" className="cursor-pointer hover:bg-gray-100">Powerlog</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" onClick={handleSubmit} disabled={createUser.isPending}>
        {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Opprett bruker
      </Button>
    </div>
  );
} 