"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ReactElement, JSX } from "react";

export default function DashboardPage(): JSX.Element {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/login");
    },
  });

  return (
    <div className="flex flex-col space-y-6 max-h-[calc(100vh-2.5rem)] overflow-y-auto scrollbar-hide pb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <path d="M3 9l9-7 9 7v11 a2 2 0 0 1-2 2H5 a2 2 0 0 1-2-2z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">House Spectrum Leasing Ltd</h1>
            <Badge variant="secondary" className="rounded-full bg-pink-600 text-white border-none">Verified</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Jessica Parker</span>
            <span>•</span>
            <span>Edited 7 hrs ago</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-8">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-xl font-semibold">5.3</span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
            <span className="text-sm text-muted-foreground">Sales</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xl font-semibold">2.4</span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
            <span className="text-sm text-muted-foreground">Profit</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-xl font-semibold">7.8</span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
            <span className="text-sm text-muted-foreground">Customer</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Inventory Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] relative  rounded-lg p-6">
            <div className="absolute top-6 right-6 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Jan 17, 25</span>
              <Badge variant="secondary" className="bg-gray-100">+$9,292</Badge>
            </div>
            <div className="absolute top-6 left-6 space-y-4">
              <div>
                <div className="text-2xl font-semibold">$13,546</div>
                <div className="text-sm font-medium text-green-500">+$5,413 (+24.8%)</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">$4,254</div>
                <div className="text-sm font-medium text-red-500">-$2,768 (+3.4%)</div>
              </div>
            </div>
            <div className="h-full w-full pt-24">
              <div className="relative h-full">

              <svg className="w-full h-[calc(100%-32px)]" viewBox="0 0 1000 200" preserveAspectRatio="none">
      {/* Revenues Path */}
      <path
        d="M0 100 
        C50 120, 100 80, 150 110 
        S200 90, 250 130 
        S300 100, 350 120 
        S400 110, 450 140 
        S500 120, 550 100 
        S600 130, 650 110 
        S700 120, 750 140 
        S800 110, 850 130 
        S900 120, 950 100 
        S1000 110, 1000 100"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        className="transition-all duration-300"
      />
      
      {/* Expenditures Path */}
      <path
        d="M0 120 
        C50 100, 100 140, 150 90 
        S200 110, 250 80 
        S300 100, 350 120 
        S400 90, 450 110 
        S500 130, 550 100 
        S600 120, 650 140 
        S700 110, 750 90 
        S800 120, 850 140 
        S900 110, 950 90 
        S1000 120, 1000 120"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        className="transition-all duration-300"
      />
      
      {/* Shaded areas */}
      <path
        d="M0 100 
        C50 120, 100 80, 150 110 
        S200 90, 250 130 
        S300 100, 350 120 
        S400 110, 450 140 
        S500 120, 550 100 
        S600 130, 650 110 
        S700 120, 750 140 
        S800 110, 850 130 
        S900 120, 950 100 
        S1000 110, 1000 100 
        L 1000 200 L 0 200 Z"
        fill="rgba(59, 130, 246, 0.1)"
        stroke="none"
      />
      <path
        d="M0 120 
        C50 100, 100 140, 150 90 
        S200 110, 250 80 
        S300 100, 350 120 
        S400 90, 450 110 
        S500 130, 550 100 
        S600 120, 650 140 
        S700 110, 750 90 
        S800 120, 850 140 
        S900 110, 950 90 
        S1000 120, 1000 120 
        L 1000 200 L 0 200 Z"
        fill="rgba(239, 68, 68, 0.1)"
        stroke="none"
      />
      

    </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                    <div key={month} className="flex flex-col items-center">
                      <div className="w-px h-2 bg-gray-200 mb-2" />
                      <span>{month}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-6 bg-white/80 px-4 py-2 rounded-full shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-muted-foreground">Equipment Deductions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm text-muted-foreground">Equipment Additions</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-5">
        <Card className="flex-[0_0_240px]">
          <CardHeader>
            <CardTitle className="text-lg">Active Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[120px]">
              <div className="text-4xl font-bold mb-3">247</div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                <Badge variant="secondary" className="bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">+12%</Badge>
                <span className="text-sm text-muted-foreground">increase</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-[0_0_240px] border-[2px] border-pink-600">
          <CardHeader>
            <CardTitle className="text-lg">Days in Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[120px]">
              <div className="text-4xl font-bold mb-3">32</div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                <Badge variant="secondary" className="bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">+5 days</Badge>
                <span className="text-sm text-muted-foreground">average</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-[0_0_240px]">
          <CardHeader>
            <CardTitle className="text-lg">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[120px]">
              <div className="text-4xl font-bold mb-3">$4.2M</div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">+$300K</Badge>
                <span className="text-sm text-muted-foreground">increase</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 ">
          <CardHeader>
            <CardTitle className="text-lg">Popular Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>BMW X5</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">32</span>
                  <Badge>High Demand</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Tesla Model Y</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">28</span>
                  <Badge variant="outline">Trending</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Mercedes GLE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">25</span>
                  <Badge variant="secondary">Stable</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">New Vehicle Added</span>
                    <Badge variant="outline">Just now</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">2024 BMW X5 xDrive40i</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Price Updated</span>
                    <Badge variant="outline">2h ago</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">2023 Mercedes-Benz GLE 350</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Vehicle Sold</span>
                    <Badge variant="outline">5h ago</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">2024 Tesla Model Y Long Range</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

  );
}