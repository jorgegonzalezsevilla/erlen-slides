/* SPDX-License-Identifier: AGPL-3.0-only */
const ERLEN_SOURCE_URL='https://github.com/jorgegonzalezsevilla/erlen-slides';
const edVersion=()=>window.ERLEN?.version||'0.1.0';
const edPuede=()=>true;
function pintaEdicion(){const b=$('#edicionBadge');if(b)b.textContent='AGPLv3';}
function openEdicion(){const body=h('div');wsServicio(body);openModal({title:'Software libre para comunicar ciencia',body});}
