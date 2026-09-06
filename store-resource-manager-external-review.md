# Avery Institute Store Resource Manager — External Review Handoff

## Use this approach

Give an external reviewer **this file** and the exact problem you see. Ask for a small change to one function or one user flow at a time. Do **not** ask for a rewrite of the full site, Store, preview system, cart, authentication, or `avery-source.html`.

> Recommended message: “Please diagnose and propose the smallest change for this specific Store Resource Manager issue: **[describe exactly what happens]**. Keep the private original files in `resource-files`, public previews limited to watermarked JPEGs in `resource-thumbnails`, and do not change the Store carousel, cart, preview modal, authentication, or homepage. Return only the changed function(s) or a unified diff.”

Then send the proposed code or diff back here. I will check it against the current project, merge only the safe parts, test it, and publish it.

## Current manager behavior

| Area | Current behavior | Important constraint |
|---|---|---|
| Visibility | The manager is an administrator-only `<details id="v14Admin">` disclosure in the Store section. | Never show manager controls to customers. |
| Supported uploads | PDF, DOCX, and PPTX are accepted. | Do not add files directly to public storage. |
| Original files | Files upload to the private `resource-files` bucket. | The original PDF must remain private. |
| PDF previews | The existing administrator-authorized Edge Function creates permanently watermarked public JPEG preview pages in `resource-thumbnails`. | Do not replace, weaken, or bypass the preview function. |
| Catalog data | Each upload creates or updates a published `resources` row with category, title, description, type, price, page count, file name, and topic tags. | Do not fabricate resources, counts, reviews, or prices. |
| Store display | The public Store now displays only real published resources; empty categories show an empty state. | Do not restore seed or placeholder resources. |

## Things an external reviewer must not change

- Do not expose Supabase keys, service-role credentials, signed original-PDF URLs, or other secrets.
- Do not make the private `resource-files` bucket public.
- Do not change the Edge Function name, `generate-resource-preview`, or its request body `{ "resourceId": "..." }`.
- Do not remove the permanent JPEG watermark requirement: **AVERY INSTITUTE**, **PREVIEW ONLY**, and **AVERYSINSTITUTE.COM**.
- Do not alter the homepage, mobile-only styling, cart, customer preview modal, login flow, or unrelated Store browsing behavior.
- Do not insert fake testimonials, reviews, ratings, resource counts, or demo products.

## Relevant implementation excerpt

This source is inside `client/public/avery-source.html`. The helper names below already exist in the page: `activeSession`, `supabase`, `RESOURCE_BUCKET`, `THUMBNAIL_BUCKET`, `resourceMimeType`, `resourceItem`, `ensurePublicThumbnail`, `renderResourceCard`, `refreshActiveTopicResources`, `refreshRemoveResourceOptions`, `refreshAttachResourceOptions`, and `managerStatus`.

```js
async function createPublishedResource({
  category, title, description, type, priceCents, pageCount, file, topicTags
}) {
  let storagePath = null;
  try {
    if (file) {
      const safeName = file.name.toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-');
      storagePath = `${activeSession.user.id}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(RESOURCE_BUCKET)
        .upload(storagePath, file, {
          contentType: resourceMimeType(file),
          upsert: false,
        });
      if (uploadError) throw uploadError;
    }

    const { data, error } = await supabase
      .from('resources')
      .insert({
        category,
        title,
        description,
        resource_type: type,
        price_cents: priceCents,
        page_count: pageCount,
        storage_path: storagePath,
        file_name: file?.name || null,
        mime_type: file ? resourceMimeType(file) : null,
        topic_tags: topicTags || [],
        created_by: activeSession.user.id,
      })
      .select('id, category, title, description, resource_type, price_cents, page_count, storage_path, file_name, thumbnail_path, topic_tags, created_at')
      .single();
    if (error) throw error;

    if (!resourceDb[category]) resourceDb[category] = [];
    resourceDb[category] = resourceDb[category].filter(item => !item.isSeed);
    const publishedItem = resourceItem(data);
    resourceDb[category].push(publishedItem);

    if (file) {
      try {
        await ensurePublicThumbnail(publishedItem);
      } catch (thumbnailError) {
        console.warn('Avery PDF thumbnail generation:',
          thumbnailError instanceof Error ? thumbnailError.message : thumbnailError);
      }
    }

    renderResourceCard(category);
    refreshActiveTopicResources();
    return publishedItem;
  } catch (error) {
    if (storagePath) await supabase.storage.from(RESOURCE_BUCKET).remove([storagePath]);
    throw error;
  }
}
```

```js
async function attachPdfToResource() {
  if (!isAdmin()) return managerStatus('Administrator access is required to attach a PDF.');

  const select = document.getElementById('v14AttachResource');
  const input = document.getElementById('v14AttachFile');
  const file = input?.files?.[0];
  const resourceId = select?.value;

  if (!resourceId) return managerStatus('Select the published resource that needs a PDF.');
  if (!file || !isSupportedResourceFile(file)) {
    return managerStatus('Choose a PDF, Word, or PowerPoint file to attach.');
  }

  const match = Object.entries(resourceDb)
    .flatMap(([category, items]) => items.map(item => ({ category, item })))
    .find(entry => entry.item.remoteId === resourceId);
  if (!match) return managerStatus('Unable to locate that resource in the Store. Refresh and try again.');

  const previousThumbnailPath = match.item.thumbnailPath;
  const storagePath = `${activeSession.user.id}/${resourceId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  managerStatus('Uploading the private PDF and generating watermarked previews of every page…');

  const { error: uploadError } = await supabase.storage
    .from(RESOURCE_BUCKET)
    .upload(storagePath, file, { contentType: resourceMimeType(file), upsert: false });
  if (uploadError) return managerStatus(uploadError.message);

  const { error: updateError } = await supabase
    .from('resources')
    .update({ storage_path: storagePath, file_name: file.name, thumbnail_path: null })
    .eq('id', resourceId);
  if (updateError) return managerStatus(updateError.message);

  if (previousThumbnailPath) {
    await supabase.storage.from(THUMBNAIL_BUCKET).remove([previousThumbnailPath]);
  }

  match.item.storagePath = storagePath;
  match.item.fileName = file.name;
  match.item.thumbnailPath = null;
  match.item.thumbnailUrl = null;
  match.item.previewPageUrls = [];

  try {
    await ensurePublicThumbnail(match.item);
  } catch (error) {
    console.warn('Avery preview generation:', error instanceof Error ? error.message : error);
  }

  renderResourceCard(match.category);
  refreshAttachResourceOptions();
  await loadManagerResources();
  refreshActiveTopicResources();
  managerStatus(`Attached ${file.name} and updated the Store preview.`);
  input.value = '';
}
```

```js
async function loadRemoteResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('id, category, title, description, resource_type, price_cents, page_count, storage_path, file_name, thumbnail_path, topic_tags, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Avery Supabase resource load:', error.message);
    return;
  }

  Object.keys(resourceDb).forEach(category => {
    resourceDb[category] = resourceDb[category].filter(item => !item.isSeed);
  });

  (data || []).forEach(row => {
    if (!resourceDb[row.category]) return;
    if (!resourceDb[row.category].some(item => item.remoteId === row.id)) {
      resourceDb[row.category].push(resourceItem(row));
    }
  });

  Object.keys(resourceDb).forEach(renderResourceCard);
  refreshRemoveResourceOptions();
  refreshAttachResourceOptions();
  refreshActiveTopicResources();
}
```

## Best way to work with an external reviewer

Describe the failure in this format:

| Include | Example |
|---|---|
| Exact action | “I choose a PDF, fill Category and Title, then click Publish to Store.” |
| Actual result | “The status says Uploaded, but the resource is not shown in the category.” |
| Expected result | “The resource should show in the selected category and generate a watermarked preview.” |
| Browser message | Copy the exact error text or attach a screenshot. |
| One change request | “Fix the refresh after successful upload; do not change previews.” |

Return the reviewer’s answer here **one function or diff at a time**. I will validate it against the private-file and preview protections before applying it.
