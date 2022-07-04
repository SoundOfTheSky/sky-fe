import { Component, createMemo, createResource } from 'solid-js';

import { request } from '@/services/fetch';
import Loading from './loading/loading';

const Img: Component<{
  url: string;
  class?: string;
  alt?: string;
}> = (properties) => {
  const [img] = createResource(
    () => properties.url,
    (url: string) => request<Blob>(url),
  );
  const src = createMemo<string | undefined>((lastSrc) => {
    if (lastSrc) URL.revokeObjectURL(lastSrc);
    const $img = img();
    if ($img) return URL.createObjectURL($img);
  });
  return (
    <div>
      <Loading when={img()}>
        <img src={src()} alt={properties.alt} class={properties.class} />
      </Loading>
    </div>
  );
};
export default Img;
