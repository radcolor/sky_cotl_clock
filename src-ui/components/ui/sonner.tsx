import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      richColors
      closeButton
      position="top-right"
      className="toaster group font-sans"
      toastOptions={{
        classNames: {
          toast:
            "group toast border-border bg-popover font-sans text-popover-foreground shadow-lg",
          title: "font-sans text-popover-foreground",
          description: "font-sans text-muted-foreground",
          actionButton:
            "bg-primary font-sans text-primary-foreground",
          cancelButton: "bg-muted font-sans text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
