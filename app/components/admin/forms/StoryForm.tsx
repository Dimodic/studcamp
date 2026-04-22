import type { Story, StoryType } from "../../../lib/domain";
import { STORY_TYPE_OPTIONS } from "../../../lib/options";
import { emptyToNull } from "../serializers";
import { ActionIconButton, FieldLabel, SelectField, TextField } from "../form-primitives";

interface SlideDraft {
  image: string;
  text: string;
  caption: string;
}

export interface StoryFormState {
  title: string;
  type: StoryType;
  image: string;
  slides: SlideDraft[];
}

export function buildStoryInitial(entity?: Partial<Story>): StoryFormState {
  return {
    title: entity?.title ?? "",
    type: entity?.type ?? "info",
    image: entity?.image ?? "",
    slides: entity?.slides?.map((slide) => ({
      image: slide.image ?? "",
      text: slide.text ?? "",
      caption: slide.caption ?? "",
    })) ?? [{ image: "", text: "", caption: "" }],
  };
}

export function serializeStory(state: StoryFormState) {
  return {
    title: state.title,
    type: state.type,
    image: state.image,
    slides: state.slides.map((slide) => ({
      image: slide.image,
      text: slide.text,
      caption: emptyToNull(slide.caption),
    })),
  };
}

interface StoryFormProps {
  state: StoryFormState;
  onChange: (next: StoryFormState) => void;
}

export function StoryForm({ state, onChange }: StoryFormProps) {
  const updateSlide = (index: number, patch: Partial<SlideDraft>) => {
    onChange({
      ...state,
      slides: state.slides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, ...patch } : slide,
      ),
    });
  };

  const removeSlide = (index: number) => {
    onChange({
      ...state,
      slides: state.slides.filter((_, slideIndex) => slideIndex !== index),
    });
  };

  const addSlide = () => {
    onChange({
      ...state,
      slides: [...state.slides, { image: "", text: "", caption: "" }],
    });
  };

  return (
    <>
      <TextField
        label="Заголовок"
        value={state.title}
        onChange={(value) => onChange({ ...state, title: value })}
      />
      <SelectField
        label="Тип"
        value={state.type}
        onChange={(value) => onChange({ ...state, type: value as StoryType })}
        options={STORY_TYPE_OPTIONS}
      />
      <TextField
        label="Изображение"
        value={state.image}
        onChange={(value) => onChange({ ...state, image: value })}
      />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <FieldLabel>Слайды</FieldLabel>
          <ActionIconButton
            kind="plus"
            label="Добавить слайд"
            onClick={(event) => {
              event.preventDefault();
              addSlide();
            }}
          />
        </div>
        {state.slides.map((slide, index) => (
          <div
            key={index}
            className="p-3 rounded-[var(--radius-md)] border space-y-3"
            style={{ borderColor: "var(--line-subtle)" }}
          >
            <TextField
              label={`Слайд ${index + 1}: изображение`}
              value={slide.image}
              onChange={(value) => updateSlide(index, { image: value })}
            />
            <TextField
              label="Текст"
              value={slide.text}
              multiline
              onChange={(value) => updateSlide(index, { text: value })}
            />
            <TextField
              label="Подпись"
              value={slide.caption}
              onChange={(value) => updateSlide(index, { caption: value })}
            />
            {state.slides.length > 1 && (
              <button
                type="button"
                onClick={() => removeSlide(index)}
                className="text-[13px]"
                style={{ color: "var(--danger)" }}
              >
                Удалить слайд
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
