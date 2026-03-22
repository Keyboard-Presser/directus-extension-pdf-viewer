<template>
  <div class="pdf-interface">

    <!-- ── Upload / Replace ─────────────────────────────────────────── -->
    <label class="upload-zone" :class="{ 'has-file': !!value, dragging }"
           @dragover.prevent="dragging = true"
           @dragleave.prevent="dragging = false"
           @drop.prevent="onDrop">
      <input ref="fileInput" type="file" accept="application/pdf" class="hidden-input"
             @change="onInputChange" />

      <div v-if="!uploading" class="upload-inner" @click="fileInput.click()">
        <v-icon :name="value ? 'swap_horiz' : 'upload_file'" large />
        <span>{{ value ? 'Click or drag to replace PDF' : 'Click or drag to upload PDF' }}</span>
        <span class="hint">application/pdf only</span>
      </div>

      <div v-else class="upload-inner uploading">
        <v-progress-circular indeterminate />
        <span>Uploading… {{ uploadProgress }}%</span>
      </div>
    </label>

    <div v-if="uploadError" class="upload-error">
      <v-icon name="error" small />
      <span>{{ uploadError }}</span>
    </div>

    <!-- ── PDF Viewer ────────────────────────────────────────────────── -->
    <div v-if="value && pdfSrc" class="viewer-card">
      <div class="viewer-toolbar">
        <v-icon name="picture_as_pdf" class="icon-pdf" />
        <span class="viewer-title">PDF Preview</span>
        <v-button icon x-small secondary :href="pdfSrc" target="_blank" v-tooltip="'Open in new tab'">
          <v-icon name="open_in_new" />
        </v-button>
        <v-button icon x-small secondary :disabled="disabled" @click="clearFile" v-tooltip="'Remove file'">
          <v-icon name="close" />
        </v-button>
      </div>
      <iframe :src="pdfSrc" class="pdf-frame" title="PDF Preview" />
    </div>

    <!-- ── Empty state ──────────────────────────────────────────────── -->
    <div v-else-if="!value" class="empty-state">
      <v-icon name="picture_as_pdf" large />
      <p>No PDF uploaded yet</p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const props = defineProps({
  value:    { type: String,  default: null  },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['input']);

const api            = useApi();
const fileInput      = ref(null);
const uploading      = ref(false);
const uploadProgress = ref(0);
const uploadError    = ref(null);
const dragging       = ref(false);

const pdfSrc = computed(() => {
  if (!props.value) return null;
  const base  = (api.defaults?.baseURL || '').replace(/\/$/, '');
  const auth  = api.defaults?.headers?.Authorization
             || api.defaults?.headers?.common?.Authorization
             || '';
  const token = auth.replace('Bearer ', '').trim();
  return token
    ? `${base}/assets/${props.value}?access_token=${token}`
    : `${base}/assets/${props.value}`;
});

async function uploadFile(file) {
  if (!file || file.type !== 'application/pdf') {
    uploadError.value = 'Only PDF files are accepted.';
    return;
  }
  uploadError.value    = null;
  uploading.value      = true;
  uploadProgress.value = 0;
  try {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('uploaded_on', new Date().toISOString());
    const response = await api.post('/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress(evt) {
        uploadProgress.value = evt.total
          ? Math.round((evt.loaded / evt.total) * 100)
          : 50;
      },
    });
    const fileId = response?.data?.data?.id;
    if (fileId) {
      emit('input', fileId);
    } else {
      uploadError.value = 'Upload succeeded but no file ID returned.';
    }
  } catch (err) {
    const msg = err?.response?.data?.errors?.[0]?.message || err.message || 'Upload failed';
    uploadError.value = msg;
  } finally {
    uploading.value      = false;
    uploadProgress.value = 0;
  }
}

function onInputChange(event) {
  const file = event.target.files?.[0];
  if (file) uploadFile(file);
  event.target.value = '';
}

function onDrop(event) {
  dragging.value = false;
  const file = event.dataTransfer.files?.[0];
  if (file) uploadFile(file);
}

function clearFile() {
  emit('input', null);
}
</script>

<style scoped>
.pdf-interface { display: flex; flex-direction: column; gap: 16px; }
.hidden-input  { display: none; }

.upload-zone {
  display: block; padding: 24px; cursor: pointer;
  border: 2px dashed var(--theme--border-color, var(--border-normal));
  border-radius: var(--theme--border-radius, var(--border-radius));
  background: var(--theme--background-subdued, var(--background-subdued));
  transition: border-color 0.2s, background 0.2s;
}
.upload-zone:hover, .upload-zone.dragging {
  border-color: var(--theme--primary, var(--primary));
  background: var(--theme--primary-background, var(--primary-background));
}
.upload-zone.has-file { border-style: solid; padding: 12px 24px; }

.upload-inner {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  color: var(--theme--foreground-subdued, var(--foreground-subdued));
  font-size: 14px; pointer-events: none;
}
.upload-inner .hint { font-size: 11px; opacity: 0.7; }
.upload-inner.uploading { gap: 10px; }

.upload-error {
  display: flex; align-items: center; gap: 6px; padding: 8px 12px;
  background: var(--danger-background, #ffe5e9);
  border: 1px solid var(--danger, #e35169);
  border-radius: var(--theme--border-radius, var(--border-radius));
  color: var(--danger, #e35169); font-size: 13px;
}

.viewer-card {
  border: 1px solid var(--theme--border-color, var(--border-normal));
  border-radius: var(--theme--border-radius, var(--border-radius));
  overflow: hidden;
}
.viewer-toolbar {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  background: var(--theme--background-subdued, var(--background-subdued));
  border-bottom: 1px solid var(--theme--border-color, var(--border-normal));
}
.icon-pdf { color: var(--danger, #e35169); }
.viewer-title { flex: 1; font-weight: 600; font-size: 14px; }
.pdf-frame { display: block; width: 100%; height: 780px; border: none; background: #fff; }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; padding: 32px;
  border: 2px dashed var(--theme--border-color, var(--border-normal));
  border-radius: var(--theme--border-radius, var(--border-radius));
  color: var(--theme--foreground-subdued, var(--foreground-subdued));
}
.empty-state p { font-size: 14px; margin: 0; }
</style>
