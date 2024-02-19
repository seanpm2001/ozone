import { LANGUAGES_MAP_CODE2 } from '@/lib/locale/languages'
import { Popover, Transition } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ActionButton } from './buttons'

const availableLanguageCodes = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'pt',
  'ru',
]

const SelectionTitle = ({
  includedLanguages,
  excludedLanguages,
}: {
  includedLanguages: string[]
  excludedLanguages: string[]
}) => {
  if (includedLanguages.length === 0 && excludedLanguages.length === 0) {
    return <>All Languages</>
  }

  const includedNames = includedLanguages.map(
    (lang) => LANGUAGES_MAP_CODE2[lang].name,
  )
  const excludedNames = excludedLanguages.map(
    (lang) => LANGUAGES_MAP_CODE2[lang].name,
  )

  return (
    <>
      <span className="text-gray-700 dark:text-gray-100">{includedNames.join(', ')}</span>
      {includedNames.length > 0 && excludedNames.length > 0 && (
        <span className="text-gray-700 dark:text-gray-100 mx-1">|</span>
      )}
      <span className="text-gray-700 dark:text-gray-100">
        {excludedNames.map((name, i) => (
          <s key={name}>
            {name}
            {i < excludedNames.length - 1 && ', '}
          </s>
        ))}
      </span>
    </>
  )
}

export const LanguagePicker: React.FC = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const tagsParam = searchParams.get('tags')
  const excludeTagsParam = searchParams.get('excludeTags')
  const tags = tagsParam?.split(',') || []
  const excludedTags = excludeTagsParam?.split(',') || []
  const includedLanguages = tags
    .filter((tag) => tag.includes('lang:'))
    .map((tag) => tag.split(':')[1])
  const excludedLanguages = excludedTags
    .filter((tag) => tag.includes('lang:'))
    .map((tag) => tag.split(':')[1])

  const toggleLanguage = (section: 'include' | 'exclude', newLang: string) => {
    const nextParams = new URLSearchParams(searchParams)
    const urlQueryKey = section === 'include' ? 'tags' : 'excludeTags'
    const selectedLanguages =
      section === 'include' ? includedLanguages : excludedLanguages
    const selectedLanguageTags = section === 'include' ? tags : excludedTags

    if (selectedLanguages.includes(newLang)) {
      const newTags = selectedLanguageTags.filter(
        (tag) => `lang:${newLang}` !== tag,
      )
      if (newTags.length) {
        nextParams.set(urlQueryKey, newTags.join(','))
      } else {
        nextParams.delete(urlQueryKey)
      }
    } else {
      nextParams.set(
        urlQueryKey,
        [...selectedLanguageTags, `lang:${newLang}`].join(','),
      )
    }

    router.push((pathname ?? '') + '?' + nextParams.toString())
  }
  const clearLanguages = () => {
    const nextParams = new URLSearchParams(searchParams)

    nextParams.delete('tags')
    nextParams.delete('excludeTags')
    router.push((pathname ?? '') + '?' + nextParams.toString())
  }

  return (
    <Popover>
      {({ open, close }) => (
        <>
          <Popover.Button className="text-sm flex flex-row items-center">
            <SelectionTitle {...{ includedLanguages, excludedLanguages }} />
            <ChevronDownIcon className="w-4 h-4" />
          </Popover.Button>

          {/* Use the `Transition` component. */}
          <Transition
            show={open}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Popover.Panel className="absolute left-1/2 z-10 mt-1 flex w-screen max-w-max -translate-x-1/4 px-4">
              <div className="w-fit-content flex-auto rounded bg-white dark:bg-slate-800 p-4 text-sm leading-6 shadow-lg dark:shadow-slate-900 ring-1 ring-gray-900/5">
                <div className="flex flex-row gap-4 text-gray-700 dark:text-gray-100">
                  <LanguageList
                    disabled={excludedLanguages}
                    selected={includedLanguages}
                    header="Include Languages"
                    onSelect={(lang) => toggleLanguage('include', lang)}
                  />
                  <LanguageList
                    disabled={includedLanguages}
                    selected={excludedLanguages}
                    header="Exclude Languages"
                    onSelect={(lang) => toggleLanguage('exclude', lang)}
                  />
                </div>
                {(includedLanguages.length > 0 ||
                  excludedLanguages.length > 0) && (
                  <div className="flex flex-row mt-2">
                    <ActionButton
                      size="xs"
                      appearance="outlined"
                      onClick={() => {
                        clearLanguages()
                        close()
                      }}
                    >
                      <span className="text-xs">Clear All</span>
                    </ActionButton>
                  </div>
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

const LanguageList = ({
  header,
  onSelect,
  selected = [],
  disabled = [],
}: {
  selected: string[]
  disabled: string[]
  header: string
  onSelect: (lang: string) => void
}) => {
  return (
    <div>
      <h4 className="text-gray-900 dark:text-gray-200 border-b border-gray-300 mb-2 pb-1">
        {header}
      </h4>
      <div className="flex flex-col items-start">
        {availableLanguageCodes.map((code2) => {
          const isDisabled = disabled.includes(code2)
          return (
            <button
              className={`w-full flex flex-row items-center justify-between ${
                isDisabled ? 'text-gray-400' : 'text-gray-700 dark:text-gray-100'
              }`}
              onClick={() => !isDisabled && onSelect(code2)}
              key={code2}
            >
              {LANGUAGES_MAP_CODE2[code2].name}
              {selected.includes(code2) && (
                <CheckIcon className="h-4 w-4 text-green-700" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
