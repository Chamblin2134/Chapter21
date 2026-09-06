import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("About Me source treatment", () => {
  it("keeps therapy frameworks while replacing the rendered About copy", () => {
    const source = readFileSync(resolve(process.cwd(), "client/public/avery-source.html"), "utf8");

    expect(source).toContain("label.textContent='ABOUT ME'");
    expect(source).toContain('<a href="#about">About Me</a>');
    expect(source).toContain("if(/^(about|about the institute)$/i.test(text))link.textContent='About Me'");
    expect(source).toContain("link.textContent='ABOUT ME'");
    expect(source).toContain("link.setAttribute('aria-label','About Me')");
    expect(source).toContain("heading.innerHTML='About Avery &amp; the <em>Institute.</em>'");
    expect(source).toContain('aboutInner.replaceChildren(label,heading,profileIntro,narrative,approachesHeading,therapyFrameworks)');
    expect(source).toContain("Cognitive Behavioral Therapy (CBT)");
    expect(source).toContain("Trauma-Informed & Recovery-Oriented Care");
    expect(source).toContain("const arrow = event.target.closest('.v14-arrow')");
    expect(source).toContain("document.addEventListener('click', event => {");
    expect(source).toContain("renderResourceCard(card.dataset.v9Client)");
    expect(source).toContain("const downloadLink=document.createElement('a')");
    expect(source).toContain("downloadLink.setAttribute('role','button')");
    expect(source).toContain("if(retainManagerOnce&&this.id==='v14Admin')");
    expect(source).toContain("approachesHeading.textContent='Therapeutic Approaches'");
    expect(source).toContain('About Avery &amp; the <em>Institute.</em>');
    expect(source).toContain("portrait.id='avery-professional-photo-placeholder'");
    expect(source).toContain('/manus-storage/avery-about-me-family-photo_6e77a241.png');
    expect(source).toContain('alt="Avery with his children"');
    expect(source).toContain('.about-me-portrait img{display:block;align-self:stretch;justify-self:stretch;width:100%;height:100%');
    expect(source).toContain('object-fit:contain;object-position:center');
    expect(source).not.toContain('Photo placeholder — replace with Avery’s photograph');
    expect(source).not.toContain('Avery &amp; Jaylee');
    expect(source).toContain('His professional experience includes substance-use counseling');
    expect(source).toContain('Avery holds an Ohio CDCA credential');
    expect(source).toContain('The Long-Term Vision');
    expect(source).toContain('resourceDb[category] = resourceDb[category].filter(item => !item.isSeed)');
    expect(source).toContain("card.querySelector('.count').textContent = 'No published resources in this collection'");
    expect(source).toContain('<span class="label">TRUST &amp; SAFETY</span>');
    expect(source).toContain('Coaching, Education &amp; Clinical-Care Boundaries');
    expect(source).toContain('call/text 988 for suicide and mental-health crisis support');
  });
});
