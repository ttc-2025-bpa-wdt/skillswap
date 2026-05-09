<script lang="ts">
    import Icon, { addCollection } from "@iconify/svelte";
    import mdiData from "@iconify-json/mdi/icons.json";
    import fa7BrandsData from "@iconify-json/fa7-brands/icons.json";
    import fa7RegularData from "@iconify-json/fa7-regular/icons.json";
    import fa7SolidData from "@iconify-json/fa7-solid/icons.json";
    import materialSymbolsData from "@iconify-json/material-symbols/icons.json";

    addCollection(mdiData);
    addCollection(fa7BrandsData);
    addCollection(fa7RegularData);
    addCollection(fa7SolidData);
    addCollection(materialSymbolsData);

    export let icon: string;
    export let width: number | string = 24;
    export let height: number | string = 24;
    export let className: string | undefined = undefined;
</script>

<Icon {icon} {width} {height} class={className} ssr={true} />