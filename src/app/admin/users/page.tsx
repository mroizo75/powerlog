"use client";

import { AddUser } from "@/components/AddUser";
import { UserList } from "@/components/UserList";
import AdminNav from "@/components/AdminNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminUsersPage() {
  return (
    <>
    <AdminNav />
    <div className="flex flex-col items-center justify-center w-full">
      
      <div className="container mx-auto p-4 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Opprett ny bruker</CardTitle>
          </CardHeader>
          <CardContent>
            <AddUser />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <UserList />
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
} 