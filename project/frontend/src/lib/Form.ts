import z from "zod/v4";

export type FormValidator = (value: string) => [boolean, string | false];

export class FormValidators {
    static readonly emailSchema = z.email();

    public static email(): FormValidator {
        return (email: string) => {
            const { success } = FormValidators.emailSchema.safeParse(email);
            return [success, success && "Please enter a valid email address"];
        };
    }

    public static password({ minLength }: { minLength?: number } = { minLength: 8 }): FormValidator {
        return (password: string) => {
            const isValid = password.length >= minLength;
            return [isValid, isValid && `Password must be at least ${minLength} characters`];
        };
    }

    public static age(min: number = 18): FormValidator {
        return (ageStr: string) => {
            const age = parseInt(ageStr, 10);
            const isValid = !isNaN(age) && age >= min;
            return [isValid, isValid && `You must be at least ${min} years old`];
        };
    }
}

export class FormTools {
    static showError(input: HTMLInputElement, errorElement: HTMLElement | null, message: string) {
        input.classList.add("error");
        if (errorElement) errorElement.textContent = message;
    }

    static clearError(input: HTMLInputElement, errorElement: HTMLElement | null) {
        input.classList.remove("error");
        if (errorElement) errorElement.textContent = "";
    }
}

export interface IFieldInit {
    validateOn: "input" | "submit";
    validator?: FormValidator;
}

export interface IFormField {
    fieldElement: HTMLInputElement;
    errorElement?: HTMLElement;
    validateOn: "input" | "submit";
    validator?: FormValidator;
}

export class Form {
    private element: HTMLFormElement;
    private submitElement: HTMLButtonElement | null = null;
    private fields: IFormField[] = [];

    public constructor(elemOrId: HTMLFormElement | string | null) {
        if (!elemOrId) {
            throw new Error("Form element cannot be null");
        }

        if (typeof elemOrId === "string") {
            const foundElement = document.getElementById(elemOrId);
            if (!foundElement || !(foundElement instanceof HTMLFormElement)) {
                throw new Error(`Form element with id "${elemOrId}" not found or is not a form.`);
            }
            elemOrId = foundElement;
        }

        this.element = elemOrId;
        this.submitElement = this.element.querySelector('[type="submit"]');

        this.element.addEventListener("submit", this.onSubmit.bind(this));
    }

    public disable(): void {
        if (this.submitElement)
            this.submitElement.disabled = true;
    }

    public enable(): void {
        if (this.submitElement)
            this.submitElement.disabled = false;
    }

    public addField(name: string, init?: Partial<IFieldInit>): this {
        const fieldElement = this.element.querySelector(`input[name="${name}"]`);
        if (!(fieldElement instanceof HTMLInputElement)) {
            console.error(`Field with name "${name}" not found in form.`);
            return this;
        }

        const field: IFormField = {
            fieldElement,
            errorElement: this.element.querySelector(`#${name}-error`),
            validateOn: init?.validateOn ?? "submit",
            validator: init?.validator
        };

        if (init?.validateOn === "input")
            fieldElement.addEventListener("input", this.getInputHandler(field));
        
        this.fields.push(field);
        return this;
    }

    private getInputHandler(field: IFormField): (e: Event) => void {
        return (e: Event) => {
            const value = field.fieldElement.value;
            if (field.validator && field.validateOn === "input") {
                const [isValid, errorMessage] = field.validator(value);
                if (!isValid) {
                    FormTools.showError(field.fieldElement, field.errorElement, errorMessage || "Invalid input");
                }
                else {
                    FormTools.clearError(field.fieldElement, field.errorElement);
                }
            }
        };
    }

    public onSubmit(e: Event): void {
        for (const field of this.fields) {
            const value = field.fieldElement.value;
            if (field.validator) {
                const [isValid, errorMessage] = field.validator(value);
                if (!isValid) {
                    FormTools.showError(field.fieldElement, field.errorElement, errorMessage || "Invalid input");
                    e.preventDefault();
                }
            }
            else {
                FormTools.clearError(field.fieldElement, field.errorElement);
            }
        }
    }
}
