"use client";
import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import {
  CalendarIcon,
  Minus,
  Plus,
  Plus as AddIcon,
  Type,
  Image,
  Upload,
  X,
} from "lucide-react";
import * as anchor from "@coral-xyz/anchor";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { uploadImage } from "@/lib/pintata";
import { useProgram } from "@/hooks/useProgram";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  title: z.string().min(1).max(50),
  description: z.string().min(1),
  options: z.array(z.string().min(1).max(100)).min(2).max(4),
  reward: z.number().multipleOf(0.01), // 0.1 SOL
  maxParticipants: z.number().int().min(1),
  minReputation: z.number().int().min(0).max(3),
  endDate: z.date(),
});

const PollForm = () => {
  const [open, setOpen] = useState(false);
  const [isTextPoll, setIsTextPoll] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleModeSwitch = (isText: boolean) => {
    setIsTextPoll(isText);
    if (!isText) {
      // Switching to image mode
      form.setValue("options", [...uploadedImages]);
    } else {
      // Switching to text mode
      form.setValue("options", ["", ""]);
    }
  };

  const { program, connection, publicKey, connected } = useProgram();

  // (badge moved to Navbar)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      options: ["", ""],
      reward: 0,
      maxParticipants: 1,
      minReputation: 0,
      endDate: new Date(),
    },
  });

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file) => uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      setUploadedImages((prev) => {
        const newImages = [...prev, ...urls];
        if (!isTextPoll) {
          form.setValue("options", newImages);
        }
        return newImages;
      });
    } catch (error) {
      console.error("Failed to upload images:", error);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index);
      if (!isTextPoll) {
        form.setValue("options", newImages);
      }
      return newImages;
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!connected || !publicKey) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected",
        description: "Please connect your wallet first to create a poll.",
      });
      return;
    }

    if (!isTextPoll && uploadedImages.length < 2) {
      toast({
        variant: "destructive",
        title: "Insufficient Images",
        description: "Please upload at least 2 images for image polls.",
      });
      return;
    }

    if (isTextPoll && values.options.filter((opt) => opt.trim()).length < 2) {
      toast({
        variant: "destructive",
        title: "Invalid Options",
        description: "Please provide at least 2 non-empty options.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Convert date to Unix timestamp
      const unixTimestamp = Math.floor(values.endDate.getTime() / 1000);

      const campaignId = new anchor.BN(Math.floor(Math.random() * 1000000));
      const title = values.title;
      const description = values.description;
      const options = isTextPoll
        ? values.options.filter((opt) => opt.trim())
        : uploadedImages;
      const reward = new anchor.BN(
        values.reward * anchor.web3.LAMPORTS_PER_SOL
      );
      const maxParticipants = new anchor.BN(values.maxParticipants);
      const minReputation = new anchor.BN(values.minReputation);
      const endDate = new anchor.BN(unixTimestamp);

      const creator = publicKey;

      const [campaignPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("campaign"),
          creator.toBuffer(),
          campaignId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const tx = await program.methods
        .createCampaign(
          campaignId,
          title,
          description,
          options,
          reward,
          maxParticipants,
          minReputation,
          endDate
        )
        .accounts({
          creator,
        })
        .rpc({
          skipPreflight: true,
        });

      console.log("Campaign created successfully:", tx);

      const campaigns = await program.account.campaign.all();
      console.log("Total campaigns:", campaigns.length);

      const submitValues = {
        ...values,
        endDate: unixTimestamp,
        pollType: isTextPoll ? "text" : "image",
        images: uploadedImages,
      };
      console.log("Submit values:", submitValues);

      // Notify home page to refresh campaigns list
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("campaigns:refresh"));
      }

      setOpen(false);
      // Reset form
      form.reset();
      setUploadedImages([]);
      setIsTextPoll(true);
      toast({
        title: "Poll Created Successfully!",
        description: "Your poll has been created and is now live.",
      });
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast({
        variant: "destructive",
        title: "Failed to Create Poll",
        description:
          error instanceof Error
            ? error.message
            : "Unknown error occurred. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative gap-2">
          Create Poll
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-semibold tracking-tight">
            Create New Poll
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-600 dark:text-neutral-400">
            Fill in the details to create a new poll campaign.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4 w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Title</FormLabel>
                    <FormControl>
                      <Input placeholder="What's your poll about?" {...field} />
                    </FormControl>
                    <FormDescription>
                      A catchy title for your poll.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="resize-none"
                        placeholder="Provide more details about your poll..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Explain what participants are voting on.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Options</FormLabel>
                  <div className="flex items-center space-x-2">
                    <Image className="w-4 h-4 text-gray-500" />

                    <Switch
                      checked={isTextPoll}
                      onCheckedChange={(checked) => handleModeSwitch(checked)}
                    />
                    <Type className="w-4 h-4 text-gray-500" />
                  </div>
                </div>

                {isTextPoll ? (
                  <>
                    {form.watch("options").map((_, index) => (
                      <FormField
                        key={index}
                        control={form.control}
                        name={`options.${index}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder={`Option ${index + 1}`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                    {form.watch("options").length < 4 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed border-2 border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700"
                        onClick={() => {
                          const currentOptions = form.getValues("options");
                          form.setValue("options", [...currentOptions, ""]);
                        }}
                      >
                        <AddIcon className="w-4 h-4 mr-2" />
                        Add Option
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Upload images for poll options
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        You can upload multiple images (max 4)
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={uploading || uploadedImages.length >= 4}
                      />
                      <label htmlFor="image-upload">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploading || uploadedImages.length >= 4}
                          className="cursor-pointer"
                          asChild
                        >
                          <span>
                            {uploading ? "Uploading..." : "Choose Images"}
                          </span>
                        </Button>
                      </label>
                    </div>

                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        {uploadedImages.map((cid, index) => (
                          <div key={index} className="relative">
                            <img
                              src={`https://maroon-elegant-leopard-869.mypinata.cloud/ipfs/${cid}`}
                              alt={`Option ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                              onClick={() => removeImage(index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <FormDescription>
                  {isTextPoll
                    ? "Provide at least 2 and up to 4 text options for the poll."
                    : "Upload at least 2 and up to 4 images for the poll options."}
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="reward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Reward (SOL)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.10"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      The total reward pool in SOL for participants.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Max Participants
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            field.onChange(Math.max(1, field.value - 1))
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          className="w-20 text-center"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 1)
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => field.onChange(field.value + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Maximum number of participants allowed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minReputation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Min Reputation
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select min reputation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Newbie</SelectItem>
                        <SelectItem value="1">Regular</SelectItem>
                        <SelectItem value="2">Veteran</SelectItem>
                        <SelectItem value="3">Legend</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Minimum reputation level required to participate.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium">
                      End Date
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Select when the poll should end.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Create Poll"}
              </Button>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PollForm;
