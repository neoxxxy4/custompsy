# Graph Report - my-api  (2026-09-13)

## Corpus Check
- 60 files · ~329,416 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 968 nodes · 1878 edges · 65 communities (49 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Mobile UI & Day Stats
- Sheet & Dialog Components
- Web Dependencies
- Alert & Picker Components
- Radix Primitives Wrap
- Mobile UI Prompts
- Rust Backend Core
- TS Config App
- Form Controls Components
- Dashboard Constructor Mockup
- Data System Models
- Dev Tooling Refs
- Command Palette
- App Navigation
- Dev Dependencies
- TS Config Node
- Shadcn Aliases Config
- Button & Field Components
- Menubar Component
- Context Menu Component
- Dropdown Menu Component
- Status Bar & Theme
- Form Component
- Mobile App Shell
- Alert Component
- Android MainActivity
- Input Group Component
- Item Component
- Badge & Breadcrumb
- Chart Component
- Drawer Component
- Navigation Menu Component
- App Root & Routing
- Balance View
- Toggle Components
- Blog Screen Mockup
- Note Sheet Mockup
- Records Screen Mockup
- Package Scripts
- Calendar View
- Diary Screen Mockup
- ESLint Config
- Accordion Component
- Popover Component
- TS Config Root
- Collapsible Component
- Hover Card Component
- Resizable Panels
- Gradle Wrapper Script
- Three Rings Mockup
- Vite Config
- Toast Notifications
- Today Screen Mockup
- Aspect Ratio Component
- Checkbox Component
- Slider Component
- Provodnik Package
- Shadcn Setup Info
- Web README Template

## God Nodes (most connected - your core abstractions)
1. `cn()` - 270 edges
2. `react` - 78 edges
3. `lucide-react` - 35 edges
4. `useLS()` - 26 edges
5. `compilerOptions` - 22 edges
6. `uid()` - 19 edges
7. `compilerOptions` - 18 edges
8. `ApiError` - 13 edges
9. `class-variance-authority` - 13 edges
10. `todayKey()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Inline-скрипт применения темы до первого рендера (localStorage aod2-theme → data-theme)` --implements--> `Кнопка циклического переключения тем в статус-баре`  [INFERRED]
  web/index.html → docs/prompts/темы-оформления.md
- `Inline-скрипт применения темы до первого рендера (localStorage aod2-theme → data-theme)` --shares_data_with--> `Ключ данных aod2-theme (useLS<string>('aod2-theme','blueprint'))`  [INFERRED]
  web/index.html → docs/prompts/темы-оформления.md
- `Command()` --calls--> `cn()`  [EXTRACTED]
  web/src/components/ui/command.tsx → web/src/lib/utils.ts
- `CommandDialog()` --calls--> `cn()`  [EXTRACTED]
  web/src/components/ui/command.tsx → web/src/lib/utils.ts
- `CommandGroup()` --calls--> `cn()`  [EXTRACTED]
  web/src/components/ui/command.tsx → web/src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Шесть сил, орбитирующих вокруг ядра LOVE (Neural Garden)** — docs_references_bios_spec_love, docs_references_bios_spec_force_discipline, docs_references_bios_spec_force_environment, docs_references_bios_spec_force_metacognition, docs_references_bios_spec_force_emotions, docs_references_bios_spec_force_neurochem, docs_references_bios_spec_force_boundaries [EXTRACTED 1.00]
- **Экран «Сегодня»: кольца прогресса и карточки читают одни ключи через useLS** — docs_mobile_ui_prompt_navigatsiya_i_glavnaya_todayview, docs_mobile_ui_prompt_navigatsiya_i_glavnaya_progress_rings, docs_mobile_ui_prompt_navigatsiya_i_glavnaya_usels, docs_mobile_ui_prompt_navigatsiya_i_glavnaya_recordsview [INFERRED 0.85]
- **Философия канала как источник концепций BIOS (ДСМ, 6 сил, нейроресурс)** — docs_references_messages_channel, docs_references_messages_architecture_hyperfocus, docs_references_messages_dsm, docs_references_bios_spec_bios [EXTRACTED 1.00]
- **Mobile blog screen layout composition** — docs_mobile_ui_kombo_blog_blog_screen, docs_mobile_ui_kombo_blog_stats_row, docs_mobile_ui_kombo_blog_post_card, docs_mobile_ui_kombo_blog_fab_new_post, docs_mobile_ui_kombo_blog_bottom_nav [EXTRACTED 1.00]
- **Combo Diary Entry Composition (text + mood tag + focus metric)** — docs_mobile_ui_комбо_дневник_combo_diary_screen, docs_mobile_ui_комбо_дневник_diary_entry_text, docs_mobile_ui_комбо_дневник_mood_tag_chip, docs_mobile_ui_комбо_дневник_focus_slider [EXTRACTED 1.00]
- **Note Detail Modal Composition** — docs_mobile_ui_комбо_заметка_окно_note_detail_bottom_sheet, docs_mobile_ui_комбо_заметка_окно_note_content_block, docs_mobile_ui_комбо_заметка_окно_tag_chip, docs_mobile_ui_комбо_заметка_окно_note_action_bar [INFERRED 0.85]
- **Записи Screen Layout Elements** — docs_mobile_ui_комбо_записи_record_type_tabs, docs_mobile_ui_комбо_записи_note_card, docs_mobile_ui_комбо_записи_bottom_navigation, docs_mobile_ui_комбо_записи_fab_create, docs_mobile_ui_комбо_записи_search_action [EXTRACTED 1.00]
- **Three-Domain Daily Progress Combo** — docs_mobile_ui_комбо_три_круга_day_progress_rings, docs_mobile_ui_комбо_три_круга_goals_section, docs_mobile_ui_комбо_три_круга_schedule_section, docs_mobile_ui_комбо_три_круга_checklists_section [EXTRACTED 1.00]
- **Today Dashboard Cards (Сегодня view)** — docs_references_variant_tg_svetlyj_daily_goals_card, docs_references_variant_tg_tyomnyi_schedule_timeline, docs_references_variant_tg_svetlyj_day_progress_ring, docs_references_variant_tg_svetlyj_daily_checklists, docs_references_variant_tg_svetlyj_quick_notes [EXTRACTED 1.00]
- **Today Dashboard Card Composition** — docs_references_variant_tg_tyomnyi_day_goals_card, docs_references_variant_tg_tyomnyi_schedule_timeline, docs_references_variant_tg_tyomnyi_day_progress_ring, docs_references_variant_tg_tyomnyi_day_checklists, docs_references_variant_tg_tyomnyi_quick_notes_card [EXTRACTED 1.00]
- **Day Progress Aggregation (62%)** — docs_references_variant_tg_tyomnyi_day_progress_ring, docs_references_variant_tg_tyomnyi_left_nav_rail, docs_references_variant_tg_tyomnyi_top_context_bar [INFERRED 0.85]
- **Today Dashboard Panel Composition** — docs_references_maket_glavnoj_konstruktor_day_goals_panel, docs_references_maket_glavnoj_konstruktor_schedule_timeline_panel, docs_references_variant_tg_svetlyj_day_progress_ring, docs_references_maket_glavnoj_konstruktor_day_checklists_panel, docs_references_variant_tg_svetlyj_quick_notes [EXTRACTED 1.00]

## Communities (65 total, 10 thin omitted)

### Community 0 - "Mobile UI & Day Stats"
Cohesion: 0.05
Nodes (77): lucide-react, react, WD, ActionSheet(), BlogMobileView(), BlogPost, TILES, ChecklistRow() (+69 more)

### Community 1 - "Sheet & Dialog Components"
Cohesion: 0.05
Nodes (42): @radix-ui/react-dialog, @radix-ui/react-tooltip, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+34 more)

### Community 2 - "Web Dependencies"
Cohesion: 0.04
Nodes (47): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @hookform/resolvers, input-otp (+39 more)

### Community 3 - "Alert & Picker Components"
Cohesion: 0.06
Nodes (35): embla-carousel-react, @radix-ui/react-alert-dialog, react-day-picker, AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+27 more)

### Community 4 - "Radix Primitives Wrap"
Cohesion: 0.08
Nodes (35): @radix-ui/react-avatar, @radix-ui/react-select, @radix-ui/react-tabs, Avatar(), AvatarFallback(), AvatarImage(), Card(), CardAction() (+27 more)

### Community 5 - "Mobile UI Prompts"
Cohesion: 0.08
Nodes (40): BlogView — вкладка «Блог», BottomNav — нижнее меню из 5 разделов, NoteSheet — заметка мини-окном (bottom sheet), Три кольца прогресса дня (цели/расписание/чек-листы), RecordsView — вкладка «Записи» с папками-чипами, Дизайн-токены тёмной Telegram-темы (#0E1621/#2AABEE), TodayView — главная «Сегодня», Хук useLS(key, initial) — данные через localStorage+синк (+32 more)

### Community 6 - "Rust Backend Core"
Cohesion: 0.11
Nodes (32): Connection, Db, Default, Error, From, HashMap, IntoResponse, Json (+24 more)

### Community 7 - "TS Config App"
Cohesion: 0.08
Nodes (25): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+17 more)

### Community 8 - "Form Controls Components"
Cohesion: 0.08
Nodes (17): clsx, input-otp, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-scroll-area, @radix-ui/react-switch, tailwind-merge, InputOTP() (+9 more)

### Community 9 - "Dashboard Constructor Mockup"
Cohesion: 0.12
Nodes (24): Dark Terminal/HUD Aesthetic, Day Checklists Panel (Чек-листы дня: Утро/Фокус/Вечер), Day Goals Panel (Цели дня), Editable Constructor Pattern (pencil/delete icons, dashed 'add' slots), Main Dashboard Constructor Mockup (Макет главной — конструктор), Schedule Timeline Panel (Расписание), Left Sidebar Navigation, Three-Column Dashboard Grid Layout (+16 more)

### Community 10 - "Data System Models"
Cohesion: 0.12
Nodes (19): CheckItem, CheckList, CHECKLISTS, DayPlan, Force, GRAPH_EDGES, GRAPH_NODES, GraphEdge (+11 more)

### Community 11 - "Dev Tooling Refs"
Cohesion: 0.09
Nodes (21): autoprefixer, date-fns, eslint, @hookform/resolvers, postcss, prettier, @radix-ui/react-separator, react-dom (+13 more)

### Community 12 - "Command Palette"
Cohesion: 0.11
Nodes (16): cmdk, Command(), CommandDialog(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator() (+8 more)

### Community 13 - "App Navigation"
Cohesion: 0.18
Nodes (17): ViewId, HUB_ITEM, NAV_ITEMS, NavDef, SideNav(), STATUS, StatusBar(), DayStats (+9 more)

### Community 14 - "Dev Dependencies"
Cohesion: 0.10
Nodes (21): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, kimi-plugin-inspect-react (+13 more)

### Community 15 - "TS Config Node"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 16 - "Shadcn Aliases Config"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 17 - "Button & Field Components"
Cohesion: 0.13
Nodes (16): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, Field(), FieldContent(), FieldDescription(), FieldError() (+8 more)

### Community 18 - "Menubar Component"
Cohesion: 0.11
Nodes (12): @radix-ui/react-menubar, Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarRadioItem(), MenubarSeparator() (+4 more)

### Community 19 - "Context Menu Component"
Cohesion: 0.12
Nodes (10): @radix-ui/react-context-menu, ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut() (+2 more)

### Community 20 - "Dropdown Menu Component"
Cohesion: 0.12
Nodes (10): @radix-ui/react-dropdown-menu, DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut() (+2 more)

### Community 21 - "Status Bar & Theme"
Cohesion: 0.20
Nodes (11): VIEW_TITLES, MiniRing(), Props, ICONS, ThemeToggle(), DEFAULT_THEME, NEXT_THEME, THEME_LABELS (+3 more)

### Community 22 - "Form Component"
Cohesion: 0.17
Nodes (13): @radix-ui/react-label, react-hook-form, FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext (+5 more)

### Community 23 - "Mobile App Shell"
Cohesion: 0.17
Nodes (11): ROADMAP, MobileApp(), MobileBottomNav(), MTab, TABS, ITEMS, PathView(), FolderKey (+3 more)

### Community 24 - "Alert Component"
Cohesion: 0.16
Nodes (12): class-variance-authority, Alert(), AlertDescription(), AlertTitle(), alertVariants, Empty(), EmptyContent(), EmptyDescription() (+4 more)

### Community 25 - "Android MainActivity"
Cohesion: 0.28
Nodes (7): Activity, MainActivity, WebViewClient, Bundle, WebResourceRequest, WebResourceResponse, WebView

### Community 26 - "Input Group Component"
Cohesion: 0.21
Nodes (10): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea() (+2 more)

### Community 27 - "Item Component"
Cohesion: 0.18
Nodes (12): Item(), ItemActions(), ItemContent(), ItemDescription(), ItemFooter(), ItemGroup(), ItemHeader(), ItemMedia() (+4 more)

### Community 28 - "Badge & Breadcrumb"
Cohesion: 0.18
Nodes (9): @radix-ui/react-slot, Badge(), badgeVariants, BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage() (+1 more)

### Community 29 - "Chart Component"
Cohesion: 0.23
Nodes (10): recharts, ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload() (+2 more)

### Community 30 - "Drawer Component"
Cohesion: 0.17
Nodes (7): vaul, DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerTitle()

### Community 31 - "Navigation Menu Component"
Cohesion: 0.20
Nodes (10): @radix-ui/react-navigation-menu, NavigationMenu(), NavigationMenuContent(), NavigationMenuIndicator(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger() (+2 more)

### Community 32 - "App Root & Routing"
Cohesion: 0.27
Nodes (6): react-router, App(), applyTheme(), asTheme(), useMediaQuery(), ChecklistsView()

### Community 33 - "Balance View"
Cohesion: 0.22
Nodes (9): FORCES, MODULES, SPHERES, BalanceView(), point(), Dashboard(), daysBetween(), SEASON_DEADLINE (+1 more)

### Community 34 - "Toggle Components"
Cohesion: 0.31
Nodes (7): @radix-ui/react-toggle, @radix-ui/react-toggle-group, ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 35 - "Blog Screen Mockup"
Cohesion: 0.32
Nodes (8): Блог screen — blog list view (dark mobile UI), Bottom navigation bar with 5 tabs: Сегодня, Записи, Блог (active), Путь, Система, Compose/edit icon button in header (top-right), Dark theme design with blue accent color and rounded cards, ЧЕРНОВИК draft badge on unpublished post card, Floating action button (+) for creating a new blog post, Publication card pattern (colored icon, title, excerpt, views/likes/comments, date), Blog stats summary row (7 постов / 1.2k просмотров / 3 черновика)

### Community 36 - "Note Sheet Mockup"
Cohesion: 0.32
Nodes (8): Bottom Sheet Modal Pattern, Bottom Tab Bar (Сегодня, Записи, Блог, Путь, Система), Dark Theme Design, Note Action Bar (favorite, share, delete, close), Note Content Block (Идея для поста), Note Detail Bottom Sheet (Комбо-заметка окно), Tag Chip (Личное), Today Dashboard Screen (Сегодня)

### Community 37 - "Records Screen Mockup"
Cohesion: 0.25
Nodes (8): Bottom Navigation (Сегодня / Записи / Блог / Путь / Система), Category Tags (Личное / Проекты), Dark Theme Design with Colored Category Icons, Floating Action Button for Creating Records, Note Card (icon, title, preview, category tag, timestamp, favorite star), Record Type Filter Tabs (Всё / Заметки / Списки / Дневник), Search Action in App Bar, Записи (Records) Screen

### Community 38 - "Package Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, check, dev, format, lint, preview, test

### Community 39 - "Calendar View"
Cohesion: 0.33
Nodes (6): CAL_EVENTS, CalEvent, CalendarView(), fmt(), MONTHS, WD

### Community 40 - "Diary Screen Mockup"
Cohesion: 0.47
Nodes (6): Bottom Navigation Bar (home / folder / mic), Combo Diary Screen (Дневник · 10 сентября), Diary Entry Free-text Narrative, Focus Metric Slider (Фокус 0-10), Mood Tag Chip (спокойствие), Voice Input Entry Point (microphone tab)

### Community 41 - "ESLint Config"
Cohesion: 0.33
Nodes (5): @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 42 - "Accordion Component"
Cohesion: 0.33
Nodes (4): @radix-ui/react-accordion, AccordionContent(), AccordionItem(), AccordionTrigger()

### Community 44 - "TS Config Root"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

### Community 47 - "Resizable Panels"
Cohesion: 0.40
Nodes (3): react-resizable-panels, ResizableHandle(), ResizablePanelGroup()

### Community 48 - "Gradle Wrapper Script"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 49 - "Three Rings Mockup"
Cohesion: 0.67
Nodes (4): Checklists Section (Чек-листы), Day Progress Triple Ring Combo, Goals Section (Цели), Schedule Section (Расписание)

### Community 50 - "Vite Config"
Cohesion: 0.50
Nodes (3): kimi-plugin-inspect-react, vite, @vitejs/plugin-react

### Community 52 - "Today Screen Mockup"
Cohesion: 0.67
Nodes (3): Bottom Navigation (5 tabs), Notes Section (Заметки), Today Screen (Сегодня)

## Ambiguous Edges - Review These
- `BottomNav — нижнее меню из 5 разделов` → `Левая рейка навигации с живыми микро-статусами`  [AMBIGUOUS]
  docs/mobile ui/промпт-навигация-и-главная.md · relation: conceptually_related_to

## Knowledge Gaps
- **244 isolated node(s):** `FormFieldContextValue`, `FormItemContextValue`, `CarouselApi`, `CarouselContextProps`, `CarouselOptions` (+239 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 336 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `BottomNav — нижнее меню из 5 разделов` and `Левая рейка навигации с живыми микро-статусами`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react` connect `Mobile UI & Day Stats` to `Sheet & Dialog Components`, `Alert & Picker Components`, `Radix Primitives Wrap`, `Form Controls Components`, `Data System Models`, `Dev Tooling Refs`, `Command Palette`, `App Navigation`, `Button & Field Components`, `Menubar Component`, `Context Menu Component`, `Dropdown Menu Component`, `Status Bar & Theme`, `Form Component`, `Mobile App Shell`, `Alert Component`, `Input Group Component`, `Item Component`, `Badge & Breadcrumb`, `Chart Component`, `Drawer Component`, `Navigation Menu Component`, `App Root & Routing`, `Balance View`, `Toggle Components`, `Calendar View`, `Accordion Component`, `Popover Component`, `Hover Card Component`, `Resizable Panels`, `Checkbox Component`, `Slider Component`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Why does `cn()` connect `Radix Primitives Wrap` to `Sheet & Dialog Components`, `Alert & Picker Components`, `Form Controls Components`, `Command Palette`, `Button & Field Components`, `Menubar Component`, `Context Menu Component`, `Dropdown Menu Component`, `Form Component`, `Alert Component`, `Input Group Component`, `Item Component`, `Badge & Breadcrumb`, `Chart Component`, `Drawer Component`, `Navigation Menu Component`, `Toggle Components`, `Accordion Component`, `Popover Component`, `Hover Card Component`, `Resizable Panels`, `Checkbox Component`, `Slider Component`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Web Dependencies` to `Dev Tooling Refs`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `FormFieldContextValue`, `FormItemContextValue`, `CarouselApi` to the rest of the system?**
  _244 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mobile UI & Day Stats` be split into smaller, more focused modules?**
  _Cohesion score 0.05053651782623745 - nodes in this community are weakly interconnected._
- **Should `Sheet & Dialog Components` be split into smaller, more focused modules?**
  _Cohesion score 0.053877551020408164 - nodes in this community are weakly interconnected._