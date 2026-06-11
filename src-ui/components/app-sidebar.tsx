import type * as React from "react";
import {
  CalendarDays,
  CheckSquare,
  Eye,
  Flame,
  Map,
  Monitor,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  Upload,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import type { AppSettings } from "@/domain/types";
import type { PlannerState } from "@/domain/planner";
import type { AppUpdateState } from "@/tauri/updater";
import { cn } from "@/lib/utils";

export type AppPage =
  | "overview"
  | "calendar"
  | "candle-runs"
  | "goals"
  | "collection"
  | "routes"
  | "overlay"
  | "settings"
  | "updates";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activePage: AppPage;
  selectedDate: Date;
  settings: AppSettings;
  planner: PlannerState;
  updateState: AppUpdateState;
  onPageChange: (page: AppPage) => void;
  onSelectedDateChange: (date: Date) => void;
  onThemeChange: (theme: AppSettings["theme"]) => void;
}

const sections: Array<{
  title: string;
  items: Array<{ id: AppPage; title: string; icon: React.ElementType }>;
}> = [
  {
    title: "Clock",
    items: [
      { id: "overview", title: "Overview", icon: Sparkles },
      { id: "overlay", title: "Overlay", icon: Eye },
    ],
  },
  {
    title: "Planner",
    items: [
      { id: "calendar", title: "Calendar", icon: CalendarDays },
      { id: "routes", title: "Routes", icon: Map },
      { id: "candle-runs", title: "Candle Run", icon: Flame },
      { id: "goals", title: "Goals", icon: CheckSquare },
      { id: "collection", title: "Collection", icon: Search },
    ],
  },
  {
    title: "System",
    items: [
      { id: "settings", title: "Settings", icon: Settings },
      { id: "updates", title: "Updates", icon: Upload },
    ],
  },
];

const themeOptions = [
  { id: "dark", title: "Dark", icon: Moon },
  { id: "light", title: "Light", icon: Sun },
  { id: "system", title: "Auto", icon: Monitor },
] as const;

export function AppSidebar({
  activePage,
  selectedDate,
  settings,
  planner,
  updateState,
  onPageChange,
  onSelectedDateChange,
  onThemeChange,
  ...props
}: AppSidebarProps) {
  const activeTheme =
    themeOptions.find((theme) => theme.id === settings.theme) ?? themeOptions[0];
  const ActiveThemeIcon = activeTheme.icon;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent className="group-data-[collapsible=icon]:pt-2">
        <SidebarGroup className="px-0 pt-2 group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onSelectedDateChange(date)}
              captionLayout="dropdown"
              className="bg-transparent [--cell-size:2.08rem]"
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="mx-0 group-data-[collapsible=icon]:hidden" />
        {sections.map((section) => (
          <SidebarSection
            key={section.title}
            title={section.title}
            items={section.items}
            activePage={activePage}
            updateAvailable={updateState.status === "available"}
            onPageChange={onPageChange}
          />
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="grid gap-2.5 px-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/35 px-2 py-1.5 text-xs text-sidebar-foreground/75">
            <span className="font-medium">Open goals</span>
            <Badge variant="secondary" className="h-5 rounded-sm">
              {planner.goals.filter((goal) => goal.status !== "done").length}
            </Badge>
          </div>
          {updateState.status === "available" ? (
            <button
              type="button"
              className="flex items-center justify-between gap-2 rounded-md border border-sidebar-primary/30 bg-sidebar-primary/10 px-2 py-1.5 text-left text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-primary/15"
              onClick={() => onPageChange("updates")}
            >
              <span className="min-w-0 truncate font-medium">
                Update {updateState.latestVersion}
              </span>
              <Badge className="h-5 rounded-sm px-1.5 text-[0.65rem]">New</Badge>
            </button>
          ) : null}
          <ThemeTabs value={settings.theme} onValueChange={onThemeChange} />
        </div>
        <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              tooltip={`Theme: ${activeTheme.title}`}
              onClick={() => onThemeChange(nextTheme(settings.theme))}
            >
              <ActiveThemeIcon />
              <span>{activeTheme.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function ThemeTabs({
  value,
  onValueChange,
}: {
  value: AppSettings["theme"];
  onValueChange: (theme: AppSettings["theme"]) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid grid-cols-3 gap-1 rounded-md border border-sidebar-border bg-sidebar-accent/45 p-1"
    >
      {themeOptions.map((theme) => {
        const selected = value === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              "grid min-h-8 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center justify-center gap-1 rounded-sm px-1.5 py-1 text-[0.66rem] font-semibold leading-tight text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50",
              selected &&
                "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:text-sidebar-primary-foreground",
            )}
            onClick={() => onValueChange(theme.id)}
          >
            <theme.icon className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate whitespace-nowrap text-center">
              {theme.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function nextTheme(current: AppSettings["theme"]) {
  const currentIndex = themeOptions.findIndex((theme) => theme.id === current);
  return themeOptions[(currentIndex + 1) % themeOptions.length].id;
}

function SidebarSection({
  title,
  items,
  activePage,
  updateAvailable,
  onPageChange,
}: {
  title: string;
  items: Array<{ id: AppPage; title: string; icon: React.ElementType }>;
  activePage: AppPage;
  updateAvailable: boolean;
  onPageChange: (page: AppPage) => void;
}) {
  return (
    <SidebarGroup className="px-3 py-1 group-data-[collapsible=icon]:px-2">
      <SidebarGroupLabel className="h-7 px-1 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                type="button"
                isActive={activePage === item.id}
                tooltip={item.title}
                className="h-8 px-2.5 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!"
                onClick={() => onPageChange(item.id)}
              >
                <item.icon />
                <span>{item.title}</span>
                {item.id === "updates" && updateAvailable ? (
                  <Badge className="ml-auto h-5 rounded-sm px-1.5 text-[0.65rem]">
                    New
                  </Badge>
                ) : null}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
