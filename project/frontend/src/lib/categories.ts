export interface Category {
    icon: string;
    title: string;
    description: string;
}

export const categories: Category[] = [
    { icon: "💻", title: "Technology", description: "Programming, Design, Data" },
    { icon: "🎨", title: "Arts & Creative", description: "Drawing, Painting, Music" },
    { icon: "🍳", title: "Lifestyle", description: "Cooking, Gardening, DIY" },
    { icon: "🗣️", title: "Languages", description: "Spanish, French, ESL" },
    { icon: "🎸", title: "Music", description: "Guitar, Piano, Theory" },
    { icon: "📸", title: "Photography", description: "Digital, Film, Editing" },
    { icon: "🧘", title: "Wellness", description: "Yoga, Meditation, Fitness" },
    { icon: "💰", title: "Finance", description: "Investing, Budgeting, Taxes" },
    { icon: "📢", title: "Marketing", description: "Social Media, SEO, Branding" },
    { icon: "✍️", title: "Writing", description: "Creative, Technical, Copy" },
];