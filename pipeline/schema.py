"""Runtime schemas for the portfolio seed and the generated map.

The site repo is not TypeScript, so these pydantic models are the validator
the build actually runs. `clientId` is rejected; projects use `clientIds`.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Award(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    year: int | None = None
    credit: str


class Project(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    notionId: str | None = None
    type: Literal["project"]
    slug: str
    name: str
    summary: str
    body: str | None = None
    year: str | None = None
    start: str | None = None
    end: str | None = None
    role: str | None = None
    ledOrMade: str | None = None
    teamSize: int | str | None = None
    teamNote: str | None = None
    demo: str | None = None
    url: str | None = None
    preview: str | None = None
    weight: float = 1
    clientIds: list[str] = Field(min_length=1)
    toolIds: list[str] = []
    ideaIds: list[str] = []
    disciplineIds: list[str] = []
    awards: list[Award] = []
    aliases: list[str] = []
    archived: bool = False
    metrics: str | None = None
    status: str | None = None
    featured: bool = False
    # Empty until pattern notes become Idea nodes. Linked like ideaIds when set.
    patternIdeaIds: list[str] = []
    visuals: str | None = None
    patterns: str | None = None
    visible: bool
    confidential: bool

    @model_validator(mode="after")
    def archived_has_no_live_link(self):
        if self.archived and any((self.demo, self.url, self.preview)):
            raise ValueError(f"{self.id} is archived and still has a live link")
        return self


class Client(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    notionId: str | None = None
    type: Literal["client"]
    slug: str
    name: str
    aliases: list[str] = []
    clientType: str
    visible: bool
    confidential: bool


class Tool(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    notionId: str | None = None
    type: Literal["tool"]
    slug: str
    name: str
    category: str | None = None
    visible: bool
    confidential: bool


class Idea(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    notionId: str | None = None
    type: Literal["idea"]
    slug: str
    name: str
    note: str | None = None
    status: str | None = None
    visible: bool
    confidential: bool


class Discipline(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    notionId: str | None = None
    type: Literal["discipline"]
    slug: str
    name: str
    visible: bool
    confidential: bool


class Withheld(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    public: bool
    reason: str


class Origin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Literal["origin:tyler"]
    type: Literal["origin"]
    slug: Literal["tyler"]
    name: str
    title: str
    label: str
    summary: str
    body: str | None = None
    visible: bool
    confidential: bool
    withheld: list[Withheld] = []


class Relation(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    from_: str = Field(alias="from")
    to: str
    kind: Literal["manual"]
    reason: str = Field(min_length=1)


class Override(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    op: Literal["pin", "nudge", "rename", "addEdge", "removeEdge", "hide", "setParam"]
    target: str
    value: str | float | bool | None = None
    at: str | None = None
    note: str | None = None


EdgeKind = Literal["semantic", "tool", "client", "discipline", "idea", "manual"]


class MapEdge(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    from_: str = Field(alias="from")
    to: str
    kind: EdgeKind
    weight: float
    similarity: float
    reason: str = Field(min_length=1)
    source: Literal["computed", "override"]


class MapCluster(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    memberIds: list[str]
    softMemberIds: list[str] = []
    centroid: list[float] = Field(min_length=3, max_length=3)
    label: str = Field(min_length=1)
    labelSource: Literal["placeholder", "llm", "manual"]


class MapFacet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    kind: Literal["client", "tool", "discipline", "idea", "year"]
    slug: str
    label: str
    projectIds: list[str]


class MapNode(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str
    slug: str
    label: str
    summary: str
    body: str
    textHash: str
    pos: list[float] = Field(min_length=3, max_length=3)
    clusterId: str | None


class MapDocument(BaseModel):
    model_config = ConfigDict(extra="allow")

    version: int
    model: str
    params: dict
    seed: int
    builtAt: str
    alignedTo: str | None
    hash: str
    nodes: list[MapNode]
    edges: list[MapEdge]
    clusters: list[MapCluster]
    facets: list[MapFacet]
