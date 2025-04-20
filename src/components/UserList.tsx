"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "ADMIN" | "USER" | "TEKNISK" | "VEKTREG" | "INNSJEKK" | "POWERLOG";

const roleDisplayNames: Record<Role, string> = {
  ADMIN: "Administrator",
  USER: "Bruker",
  TEKNISK: "Teknisk",
  VEKTREG: "Vektreg",
  INNSJEKK: "Innsjekk",
  POWERLOG: "Powerlog"
};

export function UserList() {
  const [editingUser, setEditingUser] = useState<{ id: string; email: string; name: string; role: Role } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: users, refetch } = api.user.getAll.useQuery();
  const deleteUser = api.user.delete.useMutation({
    onSuccess: () => {
      setSuccess("Bruker slettet!");
      refetch();
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  const updateUser = api.user.update.useMutation({
    onSuccess: () => {
      setSuccess("Bruker oppdatert!");
      setEditingUser(null);
      refetch();
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  const handleDelete = async (userId: string) => {
    if (window.confirm("Er du sikker på at du vil slette denne brukeren?")) {
      deleteUser.mutate({ id: userId });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUser.mutate({
      id: editingUser.id,
      email: editingUser.email,
      name: editingUser.name,
      role: editingUser.role,
    });
  };

  if (!users) {
    return <div>Laster brukere...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Registrerte brukere</h2>
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
      <div className="grid gap-4">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
            {editingUser?.id === user.id ? (
              <form onSubmit={handleUpdate} className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Navn</Label>
                  <Input
                    id="name"
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rolle</Label>
                  <Select 
                    value={editingUser.role} 
                    onValueChange={(value: Role) => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger id="role" className="bg-white">
                      <SelectValue placeholder="Velg rolle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Bruker</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                      <SelectItem value="TEKNISK">Teknisk</SelectItem>
                      <SelectItem value="VEKTREG">Vektreg</SelectItem>
                      <SelectItem value="INNSJEKK">Innsjekk</SelectItem>
                      <SelectItem value="POWERLOG">Powerlog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lagre
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                >
                  Avbryt
                </Button>
              </form>
            ) : (
              <>
                <div>
                  <p className="font-medium">{user.name || "Ingen navn"}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-sm text-gray-500">
                    {roleDisplayNames[user.role as Role] || user.role}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEditingUser({ 
                      id: user.id, 
                      email: user.email ?? "", 
                      name: user.name ?? "",
                      role: user.role as Role
                    })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(user.id)}
                    disabled={deleteUser.isPending}
                  >
                    {deleteUser.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 