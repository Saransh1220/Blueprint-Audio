import { Injectable } from '@angular/core';
import {
  LegalDocumentDto,
  LegalDocumentVersionDto,
  LegalDocumentViewDto,
  LegalRequirementDto,
  LegalSectionDto,
  LegalTableDataDto,
} from '../core/api/legal.requests';
import {
  LegalDocument,
  LegalDocumentView,
  LegalRequirement,
  LegalSection,
  LegalTableData,
  LegalVersion,
} from '../models/legal.model';

@Injectable({ providedIn: 'root' })
export class LegalAdapter {
  adaptView(dto: LegalDocumentViewDto): LegalDocumentView {
    return {
      document: this.adaptDocument(dto.document),
      currentVersion: this.adaptVersion(dto.current_version),
      upcomingVersion: dto.upcoming_version ? this.adaptVersion(dto.upcoming_version) : undefined,
    };
  }

  adaptDocument(dto: LegalDocumentDto): LegalDocument {
    return {
      key: dto.key,
      audience: dto.audience,
      locale: dto.locale,
      title: dto.title,
      createdAt: dto.created_at,
      updatedAt: dto.updated_at,
    };
  }

  adaptVersion(dto: LegalDocumentVersionDto): LegalVersion {
    return {
      id: dto.id,
      documentKey: dto.document_key,
      displayVersion: dto.display_version,
      schemaVersion: dto.schema_version,
      title: dto.title,
      summary: dto.summary,
      sections: (dto.sections || []).map((s) => this.adaptSection(s)),
      contentHash: dto.content_hash,
      updateClassification: (dto.update_classification || 'material') as
        | 'material'
        | 'minor'
        | 'urgent',
      status: (dto.status || 'published') as 'draft' | 'scheduled' | 'published' | 'archived',
      publishedAt: dto.published_at,
      effectiveAt: dto.effective_at,
      supersededAt: dto.superseded_at,
    };
  }

  adaptSection(dto: LegalSectionDto): LegalSection {
    return {
      id: dto.id,
      order: dto.order,
      title: dto.title,
      content: dto.content,
      summary: dto.summary,
      table: dto.table ? this.adaptTable(dto.table) : undefined,
    };
  }

  adaptTable(dto: LegalTableDataDto): LegalTableData {
    return {
      headers: dto.headers || [],
      rows: dto.rows || [],
    };
  }

  adaptRequirements(dtos: LegalRequirementDto[]): LegalRequirement[] {
    return (dtos || []).map((r) => ({
      documentKey: r.document_key,
      title: r.title,
      currentVersion: this.adaptVersion(r.current_version),
      accepted: r.accepted,
      lastAcceptedAt: r.last_accepted_at,
    }));
  }
}
