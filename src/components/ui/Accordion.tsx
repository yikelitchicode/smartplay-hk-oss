import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import * as React from "react";

export type AccordionProps = React.ComponentPropsWithoutRef<
	typeof BaseAccordion.Root
>;

const Accordion = React.forwardRef<
	HTMLDivElement,
	React.ComponentPropsWithoutRef<typeof BaseAccordion.Root>
>(({ className, ...props }, ref) => (
	<BaseAccordion.Root
		ref={ref}
		className={`space-y-4 ${className || ""}`}
		{...props}
	/>
));
Accordion.displayName = "Accordion";

const AccordionItem = React.forwardRef<
	HTMLDivElement,
	React.ComponentPropsWithoutRef<typeof BaseAccordion.Item>
>(({ className, ...props }, ref) => (
	<BaseAccordion.Item
		ref={ref}
		className={`border rounded-xl transition-all duration-200 overflow-hidden bg-white/80 backdrop-blur-md border-border/50 shadow-sm hover:border-primary/20 data-[state=open]:bg-white data-[state=open]:border-primary/30 data-[state=open]:shadow-lg ${className || ""}`}
		{...props}
	/>
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
	HTMLButtonElement,
	React.ComponentPropsWithoutRef<typeof BaseAccordion.Trigger>
>(({ className, children, ...props }, ref) => (
	<BaseAccordion.Header className="flex">
		<BaseAccordion.Trigger
			ref={ref}
			className={`w-full flex items-center justify-between p-6 text-left focus:outline-none group ${className || ""}`}
			{...props}
		>
			<span className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
				{children}
			</span>
			<ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:text-primary" />
		</BaseAccordion.Trigger>
	</BaseAccordion.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
	HTMLDivElement,
	React.ComponentPropsWithoutRef<typeof BaseAccordion.Panel>
>(({ className, children, ...props }, ref) => (
	<BaseAccordion.Panel
		ref={ref}
		className={`overflow-hidden text-sm transition-[height] duration-300 ease-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up ${className || ""}`}
		{...props}
	>
		<div
			className={`p-6 pt-0 text-muted-foreground leading-relaxed border-t border-dashed border-border/50 mt-2 ${className || ""}`}
		>
			{children}
		</div>
	</BaseAccordion.Panel>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
