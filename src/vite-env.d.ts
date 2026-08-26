/// <reference types="vite/client" />

declare namespace React {
  export type ReactNode =
    | ReactElement<any, any>
    | string
    | number
    | boolean
    | null
    | undefined
    | Iterable<ReactNode>;

  export interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: string | number | null;
  }

  export type JSXElementConstructor<P> =
    | ((props: P) => ReactElement<any, any> | null)
    | (new (props: P) => Component<any, any>);

  export class Component<P = {}, S = {}> {}

  export type FC<P = {}> = (props: P) => ReactElement<any, any> | null;

  export type FormEvent<T = any> = { preventDefault(): void; stopPropagation(): void; target: T; currentTarget: T; [key: string]: any };
  export type ChangeEvent<T = any> = { target: { value: string; checked?: boolean; files?: FileList | null }; currentTarget: T; [key: string]: any };
  export type MouseEvent<T = Element> = any;
  export type WheelEvent<T = Element> = { preventDefault(): void; deltaY: number; deltaX?: number; [key: string]: any };
  export type KeyboardEvent<T = Element> = any;
  export type HTMLAttributes<T> = Record<string, any>;
  export type ButtonHTMLAttributes<T> = Record<string, any>;
  export type InputHTMLAttributes<T> = Record<string, any>;
  export type TextareaHTMLAttributes<T> = Record<string, any>;
  export type SelectHTMLAttributes<T> = Record<string, any>;
  export type SVGProps<T> = Record<string, any>;
  export type Key = string | number | bigint;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element extends React.ReactElement<any, any> {}
  interface ElementChildrenAttribute {
    children: {};
  }
}

declare module "react" {
  export type ReactNode = React.ReactNode;
  export type ReactElement<P = any, T extends string | React.JSXElementConstructor<any> = string | React.JSXElementConstructor<any>> = React.ReactElement<P, T>;
  export type FC<P = {}> = React.FC<P>;
  export type FormEvent<T = Element> = React.FormEvent<T>;
  export type ChangeEvent<T = Element> = React.ChangeEvent<T>;
  export type MouseEvent<T = Element> = React.MouseEvent<T>;
  export type WheelEvent<T = Element> = React.WheelEvent<T>;
  export type KeyboardEvent<T = Element> = React.KeyboardEvent<T>;
  export type HTMLAttributes<T> = React.HTMLAttributes<T>;
  export type ButtonHTMLAttributes<T> = React.ButtonHTMLAttributes<T>;
  export type InputHTMLAttributes<T> = React.InputHTMLAttributes<T>;
  export type TextareaHTMLAttributes<T> = React.TextareaHTMLAttributes<T>;
  export type SelectHTMLAttributes<T> = React.SelectHTMLAttributes<T>;
  export type SVGProps<T> = React.SVGProps<T>;
  export type Key = React.Key;

  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useRef<T = undefined>(): { current: T | undefined };
  export function useContext<T>(context: Context<T>): T;
  export function createContext<T>(defaultValue: T): Context<T>;

  export interface Context<T> {
    Provider: (props: { value: T; children?: React.ReactNode }) => React.ReactElement<any, any> | null;
    Consumer: (props: { children: (value: T) => React.ReactNode }) => React.ReactElement<any, any> | null;
    displayName?: string;
  }

  export const Fragment: (props: { children?: React.ReactNode; key?: string | number }) => React.ReactElement<any, any> | null;
  export const StrictMode: (props: { children?: React.ReactNode }) => React.ReactElement<any, any> | null;

  const ReactDefault: {
    useState: typeof useState;
    useEffect: typeof useEffect;
    useMemo: typeof useMemo;
    useCallback: typeof useCallback;
    useRef: typeof useRef;
    useContext: typeof useContext;
    createContext: typeof createContext;
    Fragment: typeof Fragment;
    StrictMode: typeof StrictMode;
    createElement: any;
    [key: string]: any;
  };

  export default ReactDefault;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module "react/jsx-dev-runtime" {
  export const jsxDEV: any;
  export const Fragment: any;
}

declare module "react-dom/client" {
  export interface Root {
    render(children: React.ReactNode): void;
    unmount(): void;
  }
  export function createRoot(container: Element | DocumentFragment): Root;
}

declare module "lucide-react" {
  export interface LucideProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    className?: string;
    style?: any;
    [key: string]: any;
  }
  export type LucideIcon = (props: LucideProps) => any;
  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertOctagon: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Anchor: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Building2: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const CircleDot: LucideIcon;
  export const Clock: LucideIcon;
  export const Cloud: LucideIcon;
  export const Compass: LucideIcon;
  export const Cpu: LucideIcon;
  export const Crosshair: LucideIcon;
  export const Download: LucideIcon;
  export const Droplet: LucideIcon;
  export const Droplets: LucideIcon;
  export const Eye: LucideIcon;
  export const FileText: LucideIcon;
  export const Gauge: LucideIcon;
  export const Globe: LucideIcon;
  export const Globe2: LucideIcon;
  export const Headphones: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Inbox: LucideIcon;
  export const Info: LucideIcon;
  export const Layers: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const LifeBuoy: LucideIcon;
  export const LineChart: LucideIcon;
  export const Loader2: LucideIcon;
  export const Lock: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const Map: LucideIcon;
  export const MapPin: LucideIcon;
  export const Maximize2: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Minimize2: LucideIcon;
  export const Minus: LucideIcon;
  export const Moon: LucideIcon;
  export const Navigation: LucideIcon;
  export const Navigation2: LucideIcon;
  export const Paperclip: LucideIcon;
  export const Phone: LucideIcon;
  export const Play: LucideIcon;
  export const Plus: LucideIcon;
  export const Radio: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Route: LucideIcon;
  export const Ruler: LucideIcon;
  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Settings: LucideIcon;
  export const Shield: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Ship: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Snowflake: LucideIcon;
  export const Sun: LucideIcon;
  export const Thermometer: LucideIcon;
  export const Triangle: LucideIcon;
  export const User: LucideIcon;
  export const Waves: LucideIcon;
  export const Waypoints: LucideIcon;
  export const WifiOff: LucideIcon;
  export const Wind: LucideIcon;
  export const X: LucideIcon;
  export const Zap: LucideIcon;
}
