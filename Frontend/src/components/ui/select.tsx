"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type SelectProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children?: React.ReactNode
  className?: string
}

type SelectTriggerProps = React.ComponentProps<"button"> & {
  size?: "sm" | "default"
}

type SelectValueProps = {
  placeholder?: string
  children?: React.ReactNode
  className?: string
}

type SelectItemProps = {
  value: string
  disabled?: boolean
  children?: React.ReactNode
  className?: string
}

type SelectContentProps = {
  children?: React.ReactNode
  className?: string
}

type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

function textFromNode(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textFromNode).join("")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return textFromNode(node.props.children)
  }
  return ""
}

function findTrigger(
  children: React.ReactNode
): { className?: string; size?: "sm" | "default" } {
  let trigger: { className?: string; size?: "sm" | "default" } = {}

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === SelectTrigger) {
      const props = child.props as SelectTriggerProps
      trigger = { className: props.className, size: props.size }
      return
    }
    const props = child.props as { children?: React.ReactNode }
    const nested = findTrigger(props.children)
    if (nested.className || nested.size) trigger = nested
  })

  return trigger
}

function findPlaceholder(children: React.ReactNode): string | undefined {
  let placeholder: string | undefined

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === SelectValue) {
      const props = child.props as SelectValueProps
      placeholder = props.placeholder ?? textFromNode(props.children)
      return
    }
    const props = child.props as { children?: React.ReactNode }
    placeholder = placeholder ?? findPlaceholder(props.children)
  })

  return placeholder
}

function collectOptions(children: React.ReactNode): SelectOption[] {
  const options: SelectOption[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return

    if (child.type === SelectItem) {
      const props = child.props as SelectItemProps
      options.push({
        value: props.value,
        label: textFromNode(props.children) || props.value,
        disabled: props.disabled,
      })
      return
    }

    const props = child.props as { children?: React.ReactNode }
    options.push(...collectOptions(props.children))
  })

  return options
}

function Select({
  value,
  defaultValue,
  onValueChange,
  disabled,
  children,
  className,
}: SelectProps) {
  const options = React.useMemo(() => collectOptions(children), [children])
  const placeholder = React.useMemo(() => findPlaceholder(children), [children])
  const trigger = React.useMemo(() => findTrigger(children), [children])
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : defaultValue

  return (
    <div className={cn("relative flex w-full min-w-0", className)}>
      <select
        {...(isControlled
          ? { value: value ?? "" }
          : { defaultValue: defaultValue ?? "" })}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
        className={cn(
          "flex w-full min-w-0 appearance-none items-center justify-between gap-1.5 truncate rounded-lg border border-input bg-background py-0 pr-8 pl-2.5 text-sm leading-5 whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          trigger.size === "sm" ? "h-8 rounded-md" : "h-10",
          trigger.className
        )}
      >
        {placeholder && !options.some((option) => option.value === currentValue) ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function SelectValue(_props: SelectValueProps) {
  return null
}

function SelectTrigger(_props: SelectTriggerProps) {
  return null
}

function SelectContent(_props: SelectContentProps) {
  return null
}

function SelectLabel(_props: { children?: React.ReactNode; className?: string }) {
  return null
}

function SelectItem(_props: SelectItemProps) {
  return null
}

function SelectSeparator(_props: { className?: string }) {
  return null
}

function SelectScrollUpButton(_props: React.ComponentProps<"div">) {
  return null
}

function SelectScrollDownButton(_props: React.ComponentProps<"div">) {
  return null
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
