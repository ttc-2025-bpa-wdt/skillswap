<script lang="ts">
    import { SITE_TITLE } from "shared/config";

    const currentYear = new Date().getFullYear();
</script>

<div class="footer-content">
    <div class="footer-section">
        <h3>{SITE_TITLE}</h3>
        <p>Learn. Teach. Connect.</p>
    </div>
    <div class="footer-section">
        <h4>Links</h4>
        <a href="/about">Contact Us</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Use</a>
    </div>
    <div class="footer-section">
        <h4>Follow Us</h4>
        <div class="socials">
            <a href="/about#contact" aria-label="Twitter"
                ><iconify-icon icon="fa7-brands:x-twitter" width="24" height="24" aria-label="Twitter"></iconify-icon></a
            >
            <a href="/about#contact" aria-label="Facebook"
                ><iconify-icon icon="fa7-brands:facebook" width="24" height="24" aria-label="Facebook"></iconify-icon></a
            >
            <a href="/about#contact" aria-label="Instagram"
                ><iconify-icon icon="fa7-brands:instagram" width="24" height="24" aria-label="Instagram"></iconify-icon></a
            >
            <a href="/about#contact" aria-label="LinkedIn"
                ><iconify-icon icon="fa7-brands:linkedin" width="24" height="24" aria-label="LinkedIn"></iconify-icon></a
            >
        </div>
    </div>
</div>
<div class="copyright">
    <p>&copy; {currentYear} {SITE_TITLE}. All rights reserved.</p>
</div>

<style lang="scss">
    .footer-content {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        max-width: 1200px;
        margin: 0 auto;
        gap: 3rem;
        text-align: left; /* Ensure left alignment */
    }

    .footer-section {
        flex: 1 1 250px; /* Allow growing and shrinking, base width 250px */
        min-width: 200px;

        h3 {
            color: var(--accent-1);
            margin-top: 0;
            font-size: 1.5rem;
            margin-bottom: 1rem;
        }

        h4 {
            margin-top: 0;
            margin-bottom: 1.2rem;
            color: var(--foreground);
            font-size: 1.1rem;
            font-weight: 600;
        }

        a {
            display: block;
            text-decoration: none;
            color: var(--foreground);
            opacity: 0.8;
            margin-bottom: 0.8rem;
            transition: all 0.2s ease;

            &:hover {
                opacity: 1;
                color: var(--accent-1);
                transform: translateX(5px);
            }
        }

        p {
            line-height: 1.6;
            opacity: 0.9;
        }
    }

    .socials {
        display: flex;
        gap: 1.5rem;
        margin-top: 1rem;

        a {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: color-mix(in srgb, var(--accent-3), transparent 80%);
            transition: all 0.3s ease;

            &:hover {
                background-color: var(--accent-1);
            }
        }
    }

    .copyright {
        text-align: center;
        margin-top: 3rem;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 0.9rem;
        opacity: 0.7;
    }
</style>
