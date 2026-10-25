# GAS → GCP Mapping

Current GAS function count: **114**

## Config / Template
Target: **TemplateService / ConfigService**

- `getAppConfig`
- `saveAppConfig`
- `getSlidePresets`
- `saveSlidePreset`
- `deleteSlidePreset`
- `makeStarterTemplate`

## Slides / Deck
Target: **SlidesService + SlidesAdapter + ExportService**

- `createDeck`
- `mt42GetPresentationSlides`
- `exportPptx`

## Project / Source
Target: **ProjectService + SourceService + DriveAdapter**

- `mt33ProgressKey_`
- `mt33SetProgress_`
- `mt33GetProgress`
- `mt33WorkspaceRoot_`
- `mt33EnsureChild_`
- `mt33ProjectRoot_`
- `mt33CommonTemplateRoot_`
- `mt33CommonAssetRoot_`
- `mt33ReferenceRoot_`
- `mt33SystemFolder_`
- `mt33ListTemplates`
- `mt33SelectTemplate`
- `mt33ProjectFromFolder_`
- `mt33GetProject_`
- `mt33CreateProject`
- `mt33ListProjects`
- `mt33SetActiveProject`
- `mt33GetActiveProjectSafe_`
- `mt33GetActiveProject`
- `mt33ListSources`
- `mt33UploadSource`
- `mt33CopySourceFromDrive`
- `mt33ReadPdf`
- `mt33RefMeta_`
- `mt33AnalyzeRef_`
- `mt33RegisterReference`
- `mt33ListReferences`
- `mt33GetPrefs`
- `mt33SavePrefs`
- `mt33BuildPromptContext`
- `mt33WorkspaceSummary`

## Navigation
Target: **BootstrapService / QueryService / PreviewService**

- `mt40ListCompletedSlides`
- `mt40GetNavigationData`
- `mt40GetProjectState`
- `mt42GetSidebarData`
- `mt42GetPresentationSlides`

## Style
Target: **StyleService + StyleResolver**

- `mt41StyleRoot_`
- `mt41StyleChildren_`
- `mt41DefaultMeta_`
- `mt41ReadMeta_`
- `mt41WriteMeta_`
- `mt41StyleFromFolder_`
- `mt41StarterDefinitions_`
- `mt41EnsureStarterStyles_`
- `mt41ListStyles`
- `mt41GetStyle_`
- `mt41GetEffectiveStyle_`
- `mt41CreateStyle`
- `mt41SaveStyle`
- `mt41SetActiveStyle`
- `mt41GetActiveStyle`
- `mt41ListStyleTemplates`
- `mt41SyncStyleRefs_`
- `mt41ListStyleReferences`
- `mt41AddReference`
- `mt41BuildStyleContext`
- `mt41GetNavigationData`

## Learning
Target: **DesignProfileService + LearningService**

- `getDesignProfile`
- `learnFromReferenceDecks`
- `setProfileRule`
- `removeProfileRule`
- `previewEditedDeckLearning`
- `approveEditedDeckLearning`
- `exportDesignProfile`
- `importDesignProfile`

## Reliability / Capability
Target: **CapabilityService + middleware + idempotency**

- `mt516FastWorkspaceHtml_`
- `mt515Esc_`
- `mt515WorkspaceHtml_`
- `mt515StyleHtml_`
- `mt515ProjectHtml_`
- `mt515ProjectOptions_`
- `mt515StyleOptions_`
- `mt5EnsureSchema_`
- `mt5RequestKey_`
- `mt5ReadRequest_`
- `mt5WriteRequest_`
- `mt5DeleteRequest_`
- `mt5ClassifyError_`
- `mt5WithRetry_`
- `mt5GetCapabilities`
- `mt5GetSidebarCached_`
- `mt5InvalidateCaches_`
- `mt5Bootstrap`
- `mt5CreateProject`
- `mt5CreateDeck`
- `mt5HealthCheck`

## Other helpers

- `doGet`
- `parseDriveId_`
- `validateOptions_`
- `addBox_`
- `validateDeck_`
- `removeLayoutMarker_`
- `formatSource_`
- `insertImages_`
- `clearResidualTags_`
- `uploadCrop`
- `mt3SafeText_`
- `mt3Color_`
- `mt3Counter_`
- `mt3GetShapeText_`
- `mt3Snapshot_`
- `mt3ProfileFromSnapshots_`
- `mt3BaselineIndex_`
- `mt3SaveBaseline_`
- `mt43ReadTextSource`
- `mt43HealthCheck`

## Migration rule
Preserve behavior and tests; do not preserve GAS global-function architecture.
