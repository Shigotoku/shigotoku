# Data Model

## users/{userId}
email, displayName, photoUrl, personalOrganizationId, createdAt, lastLoginAt, status

## organizations/{organizationId}
name, type(personal/company), ownerUserId, plan, brandPolicyId, createdAt, updatedAt

## memberships/{id}
organizationId, userId, role(owner/admin/member/viewer), status, createdAt

## projects/{projectId}
organizationId, ownerUserId, name, styleId, driveFolderId, sourceFolderId, slidesFolderId, assetFolderId, templateFileId, lastGeneratedDeckId, status, createdAt, updatedAt

## styles/{styleId}
organizationId, ownerUserId, visibility, kind, name, baseStyleId, description, purpose, audience, animationPolicy, templateFileId, referenceIds[], rules[], lockedRules[], createdAt, updatedAt

## references/{referenceId}
organizationId, ownerUserId, styleId?, driveFileId, fileName, learn{design,writing,structure,charts,motion}, reason, approved, createdAt

## designProfiles/{profileId}
scopeType, scopeId, features, rules, sourceReferenceIds, schemaVersion, updatedAt

## generationJobs/{jobId}
organizationId, userId, projectId, styleId, engine, status, progressPercent, currentStep, inputFingerprint, outputDeckId, errorCode, errorMessage, requestId, timestamps

## decks/{deckId}
projectId, driveFileId, name, generationJobId, version, createdAt

## subscriptions/{organizationId}
provider, customerId, subscriptionId, plan, status, currentPeriodEnd

## auditLogs/{id}
organizationId, userId, action, targetType, targetId, requestId, createdAt, metadata

**Data ownership:** Source/Slides bodyは可能な限りGoogle Drive。Firestoreはmetadata/index/operational state。
